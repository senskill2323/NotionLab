import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { getAssistantSettings, upsertAssistantSettings, getAssistantLimits, upsertAssistantLimit, testRag, testMemorySearch, testMemoryWrite, getRecentAssistantMetrics, ttsPreview, createRealtimeAnswer } from '@/lib/assistantAdminApi';

const VOICES = [
  'verse', 'alloy', 'aria', 'bright', 'calm', 'clear', 'soft', 'warm'
];

const AssistantAdminPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    enabled: true,
    instructions: "Tu es l'assistante de Yann. Tutoiement, français par défaut, ton dynamique.",
    voice: 'verse',
    speech_rate: 5,
    enable_audio: true,
    enable_text: true,
    enable_vision: true,
    push_to_talk_default: false,
    default_language: 'fr',
    allow_language_auto: true,
    rag_url: '',
    memory_write_url: '',
    memory_search_url: '',
    write_memory_default: true,
    rag_error_message: "Je n’ai pas accès à tes documents pour le moment. Je tente un accès générique et je me reconnecte si possible.",
    reconnect_message: "Connexion instable, je tente de me reconnecter…",
  });
  const [limitsGlobal, setLimitsGlobal] = useState({
    scope: 'global',
    max_session_seconds: 900,
    max_bitrate_kbps: 64,
    max_rag_context_kb: 256,
  });
  const [allowEditUrls, setAllowEditUrls] = useState(false);

  const [testBusy, setTestBusy] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [metrics, setMetrics] = useState([]);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [rtBusy, setRtBusy] = useState(false);
  const [rtActive, setRtActive] = useState(false);
  const remoteAudioRef = useRef(null);
  const pcRef = useRef(null);
  const micStreamRef = useRef(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [s, gl, mx] = await Promise.all([
          getAssistantSettings(),
          (async () => (await getAssistantLimits('global'))[0])(),
          getRecentAssistantMetrics(20),
        ]);
        if (s) setSettings(prev => ({ ...prev, ...s }));
        if (gl) setLimitsGlobal(prev => ({ ...prev, ...gl }));
        if (mx) setMetrics(mx);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const saved = await upsertAssistantSettings(settings);
      setSettings(prev => ({ ...prev, ...saved }));
      const savedLimits = await upsertAssistantLimit(limitsGlobal);
      if (savedLimits) setLimitsGlobal(prev => ({ ...prev, ...savedLimits }));
      toast({ title: 'Sauvegardé', description: 'Paramètres appliqués immédiatement.' });
    } catch (e) {
      console.error(e);
      toast({ title: 'Erreur', description: 'Impossible de sauvegarder.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const runTestRag = async () => {
    setTestBusy(true);
    try {
      const data = await testRag({ query: 'Test admin: quelles sources disponibles ?' });
      setTestResult({ kind: 'rag', data });
    } catch (e) {
      setTestResult({ kind: 'rag', error: String(e?.message || e) });
    } finally {
      setTestBusy(false);
    }
  };

  const runTestMemory = async () => {
    setTestBusy(true);
    try {
      const search = await testMemorySearch({ query: 'test' });
      const write = await testMemoryWrite();
      setTestResult({ kind: 'memory', data: { search, write } });
    } catch (e) {
      setTestResult({ kind: 'memory', error: String(e?.message || e) });
    } finally {
      setTestBusy(false);
    }
  };

  const handlePreviewVoice = async () => {
    if (previewBusy) return;
    setPreviewBusy(true);
    try {
      const data = await ttsPreview({ voice: settings.voice });
      if (!data?.audioBase64) throw new Error('Aucun audio reçu');
      const ct = data?.contentType || 'audio/mpeg';
      const audio = new Audio(`data:${ct};base64,${data.audioBase64}`);
      const rate = Math.max(0.5, Math.min(2, (settings.speech_rate || 5) / 5));
      audio.playbackRate = rate;
      await audio.play();
    } catch (e) {
      console.error(e);
      toast({ title: 'Pré‑écoute échouée', description: String(e?.message || e), variant: 'destructive' });
    } finally {
      setPreviewBusy(false);
    }
  };

  const startRealtimeTest = async () => {
    if (rtBusy || rtActive) return;
    setRtBusy(true);
    try {
      if (!navigator?.mediaDevices?.getUserMedia) throw new Error('getUserMedia non supporté par le navigateur');
      const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = mic;

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });
      pcRef.current = pc;

      pc.ontrack = (ev) => {
        const [remote] = ev.streams || [];
        if (remoteAudioRef.current && remote) {
          remoteAudioRef.current.srcObject = remote;
        }
      };

      pc.onconnectionstatechange = () => {
        const st = pc.connectionState;
        if (st === 'connected') setRtActive(true);
        if (st === 'failed' || st === 'disconnected' || st === 'closed') {
          setRtActive(false);
        }
      };

      // Publish mic
      for (const track of mic.getTracks()) {
        pc.addTrack(track, mic);
      }

      // Also request to receive audio from remote
      pc.addTransceiver('audio', { direction: 'recvonly' });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const answerPayload = await createRealtimeAnswer(offer.sdp);
      const answerSdp = answerPayload?.sdp;
      if (!answerSdp) throw new Error('Réponse SDP invalide');

      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });
    } catch (e) {
      console.error(e);
      toast({ title: 'Session Realtime échouée', description: String(e?.message || e), variant: 'destructive' });
      // Cleanup if we failed mid‑way
      try {
        micStreamRef.current?.getTracks()?.forEach(t => t.stop());
      } catch {}
      try { pcRef.current?.close(); } catch {}
      pcRef.current = null;
      micStreamRef.current = null;
      setRtActive(false);
    } finally {
      setRtBusy(false);
    }
  };

  const stopRealtimeTest = () => {
    try {
      pcRef.current?.getSenders()?.forEach(s => {
        try { s.track?.stop(); } catch {}
      });
    } catch {}
    try {
      micStreamRef.current?.getTracks()?.forEach(t => t.stop());
    } catch {}
    try { pcRef.current?.close(); } catch {}
    pcRef.current = null;
    micStreamRef.current = null;
    setRtActive(false);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Helmet>
        <title>Assistant IA (Admin) | NotionLab</title>
        <meta name="description" content="Configuration globale de l’assistant GPT-Realtime et intégrations RAG/Mémoire." />
      </Helmet>

      <div className="grid gap-6">
        <Card className="glass-effect">
          <CardHeader>
            <CardTitle>Paramètres</CardTitle>
            <CardDescription>Configuration globale. Les changements s’appliquent immédiatement.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Kill-switch global</div>
                <div className="text-sm text-foreground/70">Coupe l’assistant instantanément dans toute l’app.</div>
              </div>
              <Switch checked={!!settings.enabled} onCheckedChange={(v) => setSettings({ ...settings, enabled: !!v })} />
            </div>

            <div>
              <div className="font-medium mb-1">Instructions système</div>
              <textarea className="w-full min-h-[100px] p-2 border rounded-md bg-background" value={settings.instructions || ''} onChange={(e) => setSettings({ ...settings, instructions: e.target.value })} />
              <div className="text-xs text-foreground/70 mt-1">Persona “L’assistant de Yann”, tutoiement, FR par défaut, ton dynamique. L’assistant peut répondre en anglais si l’utilisateur parle anglais.</div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="font-medium mb-1">Voix TTS (OpenAI)</div>
                <select className="w-full p-2 border rounded-md bg-background" value={settings.voice || 'verse'} onChange={(e) => setSettings({ ...settings, voice: e.target.value })}>
                  {VOICES.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <div className="font-medium mb-1">Vitesse de parole</div>
                <input type="range" min={1} max={10} value={settings.speech_rate || 5} onChange={(e) => setSettings({ ...settings, speech_rate: Number(e.target.value) })} className="w-full" />
                <div className="text-xs text-foreground/70">Lecture côté client avec <code>playbackRate</code> ≈ {settings.speech_rate || 5}/10</div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-3 border rounded-md">
                <div>
                  <div className="font-medium">Audio</div>
                  <div className="text-xs text-foreground/70">Activé par défaut</div>
                </div>
                <Switch checked={!!settings.enable_audio} onCheckedChange={(v) => setSettings({ ...settings, enable_audio: !!v })} />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-md">
                <div>
                  <div className="font-medium">Texte</div>
                  <div className="text-xs text-foreground/70">Activé par défaut</div>
                </div>
                <Switch checked={!!settings.enable_text} onCheckedChange={(v) => setSettings({ ...settings, enable_text: !!v })} />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-md">
                <div>
                  <div className="font-medium">Vision</div>
                  <div className="text-xs text-foreground/70">Activé par défaut</div>
                </div>
                <Switch checked={!!settings.enable_vision} onCheckedChange={(v) => setSettings({ ...settings, enable_vision: !!v })} />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-md">
                <div>
                  <div className="font-medium">Push‑to‑Talk</div>
                  <div className="text-xs text-foreground/70">L’assistant ne démarre pas tant que le micro n’est pas autorisé.</div>
                </div>
                <Switch checked={!!settings.push_to_talk_default} onCheckedChange={(v) => setSettings({ ...settings, push_to_talk_default: !!v })} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-effect">
          <CardHeader>
            <CardTitle>Intégrations</CardTitle>
            <CardDescription>Afficher/saisir les URL existantes (non modifiées par défaut). Les secrets restent côté serveur.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Switch checked={allowEditUrls} onCheckedChange={setAllowEditUrls} />
              <div className="text-sm">Permettre l’édition des URL</div>
            </div>
            <div>
              <div className="text-xs text-foreground/70 mb-1">rag-search URL</div>
              <input disabled={!allowEditUrls} value={settings.rag_url || ''} onChange={(e) => setSettings({ ...settings, rag_url: e.target.value })} className="w-full p-2 border rounded-md bg-background" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-foreground/70 mb-1">memory-write URL</div>
                <input disabled={!allowEditUrls} value={settings.memory_write_url || ''} onChange={(e) => setSettings({ ...settings, memory_write_url: e.target.value })} className="w-full p-2 border rounded-md bg-background" />
              </div>
              <div>
                <div className="text-xs text-foreground/70 mb-1">memory-search URL</div>
                <input disabled={!allowEditUrls} value={settings.memory_search_url || ''} onChange={(e) => setSettings({ ...settings, memory_search_url: e.target.value })} className="w-full p-2 border rounded-md bg-background" />
              </div>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-md">
              <div>
                <div className="font-medium">Écriture mémoire</div>
                <div className="text-xs text-foreground/70">Active par défaut</div>
              </div>
              <Switch checked={!!settings.write_memory_default} onCheckedChange={(v) => setSettings({ ...settings, write_memory_default: !!v })} />
            </div>
            <div>
              <div className="text-xs text-foreground/70 mb-1">Message d’erreur RAG standard</div>
              <input value={settings.rag_error_message || ''} onChange={(e) => setSettings({ ...settings, rag_error_message: e.target.value })} className="w-full p-2 border rounded-md bg-background" />
            </div>
            <div>
              <div className="text-xs text-foreground/70 mb-1">Message de reconnexion session</div>
              <input value={settings.reconnect_message || ''} onChange={(e) => setSettings({ ...settings, reconnect_message: e.target.value })} className="w-full p-2 border rounded-md bg-background" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-effect">
          <CardHeader>
            <CardTitle>Tests</CardTitle>
            <CardDescription>Pré‑écoute voix, session Realtime de test, requêtes RAG/mémoire, journaux récents.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2 items-center">
              <Button variant="outline" onClick={handlePreviewVoice} disabled={previewBusy || !settings.enable_audio || settings.enabled === false}>
                {previewBusy ? 'Pré‑écoute…' : 'Pré‑écouter la voix'}
              </Button>
              {!rtActive ? (
                <Button variant="outline" onClick={startRealtimeTest} disabled={rtBusy || settings.enabled === false}>
                  {rtBusy ? 'Démarrage…' : 'Démarrer session Realtime (test)'}
                </Button>
              ) : (
                <Button variant="destructive" onClick={stopRealtimeTest}>
                  Arrêter session Realtime
                </Button>
              )}
              <Button onClick={runTestRag} disabled={testBusy}>Tester RAG</Button>
              <Button onClick={runTestMemory} disabled={testBusy}>Tester Mémoire</Button>
              <Button variant="secondary" onClick={handleSave} disabled={saving}>{saving ? 'Sauvegarde…' : 'Sauvegarder'}</Button>
              <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />
            </div>
            {testResult && (
              <pre className="p-2 bg-muted rounded-md overflow-auto text-xs max-h-64">{JSON.stringify(testResult, null, 2)}</pre>
            )}
            <div>
              <div className="font-medium mb-2">Journaux récents</div>
              {metrics?.length ? (
                <div className="max-h-64 overflow-auto border rounded-md">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted">
                        <th className="p-2 text-left">ts</th>
                        <th className="p-2 text-left">event</th>
                        <th className="p-2 text-left">latency_ms</th>
                        <th className="p-2 text-left">rag_error</th>
                        <th className="p-2 text-left">sources</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.map((m) => (
                        <tr key={m.id} className="border-t">
                          <td className="p-2">{new Date(m.ts).toLocaleString()}</td>
                          <td className="p-2">{m.event}</td>
                          <td className="p-2">{m.latency_ms ?? ''}</td>
                          <td className="p-2">{m.rag_error ? 'oui' : ''}</td>
                          <td className="p-2">{m.rag_sources_count ?? ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-sm text-foreground/70">Aucun journal récent.</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-effect">
          <CardHeader>
            <CardTitle>Observabilité & limites</CardTitle>
            <CardDescription>Métriques globales et limites configurables (global / par utilisateur).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 border rounded-md">
                <div className="text-xs text-foreground/70">Sessions (24h)</div>
                <div className="text-2xl font-semibold">—</div>
              </div>
              <div className="p-3 border rounded-md">
                <div className="text-xs text-foreground/70">Latence moyenne</div>
                <div className="text-2xl font-semibold">—</div>
              </div>
              <div className="p-3 border rounded-md">
                <div className="text-xs text-foreground/70">Taux d’erreur RAG</div>
                <div className="text-2xl font-semibold">—</div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <div className="text-xs text-foreground/70 mb-1">Durée max de session (s)</div>
                <input type="number" min={60} step={30} className="w-full p-2 border rounded-md bg-background" value={limitsGlobal.max_session_seconds} onChange={(e) => setLimitsGlobal({ ...limitsGlobal, max_session_seconds: Number(e.target.value) })} />
              </div>
              <div>
                <div className="text-xs text-foreground/70 mb-1">Débit max (kbps)</div>
                <input type="number" min={16} step={8} className="w-full p-2 border rounded-md bg-background" value={limitsGlobal.max_bitrate_kbps} onChange={(e) => setLimitsGlobal({ ...limitsGlobal, max_bitrate_kbps: Number(e.target.value) })} />
              </div>
              <div>
                <div className="text-xs text-foreground/70 mb-1">Taille max contexte RAG (KB)</div>
                <input type="number" min={64} step={32} className="w-full p-2 border rounded-md bg-background" value={limitsGlobal.max_rag_context_kb} onChange={(e) => setLimitsGlobal({ ...limitsGlobal, max_rag_context_kb: Number(e.target.value) })} />
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saving}>{saving ? 'Sauvegarde…' : 'Sauvegarder'}</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
};

export default AssistantAdminPage;
