BEGIN;

CREATE TABLE IF NOT EXISTS public.countries (
  code_iso2 CHAR(2) PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS countries_name_idx ON public.countries (lower(name));

ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS countries_select_authenticated ON public.countries;
CREATE POLICY countries_select_authenticated
  ON public.countries
  FOR SELECT
  TO authenticated
  USING (TRUE);

WITH payload AS (
  SELECT $$
[
  { "name": "Afghanistan", "code": "AF" },
  { "name": "Afrique du Sud", "code": "ZA" },
  { "name": "Albanie", "code": "AL" },
  { "name": "Algérie", "code": "DZ" },
  { "name": "Allemagne", "code": "DE" },
  { "name": "Andorre", "code": "AD" },
  { "name": "Angola", "code": "AO" },
  { "name": "Antigua-et-Barbuda", "code": "AG" },
  { "name": "Arabie Saoudite", "code": "SA" },
  { "name": "Argentine", "code": "AR" },
  { "name": "Arménie", "code": "AM" },
  { "name": "Australie", "code": "AU" },
  { "name": "Autriche", "code": "AT" },
  { "name": "Azerbaïdjan", "code": "AZ" },
  { "name": "Bahamas", "code": "BS" },
  { "name": "Bahreïn", "code": "BH" },
  { "name": "Bangladesh", "code": "BD" },
  { "name": "Barbade", "code": "BB" },
  { "name": "Belgique", "code": "BE" },
  { "name": "Belize", "code": "BZ" },
  { "name": "Bénin", "code": "BJ" },
  { "name": "Bhoutan", "code": "BT" },
  { "name": "Biélorussie", "code": "BY" },
  { "name": "Birmanie", "code": "MM" },
  { "name": "Bolivie", "code": "BO" },
  { "name": "Bosnie-Herzégovine", "code": "BA" },
  { "name": "Botswana", "code": "BW" },
  { "name": "Brésil", "code": "BR" },
  { "name": "Brunei", "code": "BN" },
  { "name": "Bulgarie", "code": "BG" },
  { "name": "Burkina Faso", "code": "BF" },
  { "name": "Burundi", "code": "BI" },
  { "name": "Cambodge", "code": "KH" },
  { "name": "Cameroun", "code": "CM" },
  { "name": "Canada", "code": "CA" },
  { "name": "Cap-Vert", "code": "CV" },
  { "name": "Chili", "code": "CL" },
  { "name": "Chine", "code": "CN" },
  { "name": "Chypre", "code": "CY" },
  { "name": "Colombie", "code": "CO" },
  { "name": "Comores", "code": "KM" },
  { "name": "Corée du Nord", "code": "KP" },
  { "name": "Corée du Sud", "code": "KR" },
  { "name": "Costa Rica", "code": "CR" },
  { "name": "Côte d'Ivoire", "code": "CI" },
  { "name": "Croatie", "code": "HR" },
  { "name": "Cuba", "code": "CU" },
  { "name": "Danemark", "code": "DK" },
  { "name": "Djibouti", "code": "DJ" },
  { "name": "Dominique", "code": "DM" },
  { "name": "Égypte", "code": "EG" },
  { "name": "Émirats arabes unis", "code": "AE" },
  { "name": "Équateur", "code": "EC" },
  { "name": "Érythrée", "code": "ER" },
  { "name": "Espagne", "code": "ES" },
  { "name": "Estonie", "code": "EE" },
  { "name": "Eswatini", "code": "SZ" },
  { "name": "États-Unis", "code": "US" },
  { "name": "Éthiopie", "code": "ET" },
  { "name": "Fidji", "code": "FJ" },
  { "name": "Finlande", "code": "FI" },
  { "name": "France", "code": "FR" },
  { "name": "Gabon", "code": "GA" },
  { "name": "Gambie", "code": "GM" },
  { "name": "Géorgie", "code": "GE" },
  { "name": "Ghana", "code": "GH" },
  { "name": "Grèce", "code": "GR" },
  { "name": "Grenade", "code": "GD" },
  { "name": "Guatemala", "code": "GT" },
  { "name": "Guinée", "code": "GN" },
  { "name": "Guinée équatoriale", "code": "GQ" },
  { "name": "Guinée-Bissau", "code": "GW" },
  { "name": "Guyana", "code": "GY" },
  { "name": "Haïti", "code": "HT" },
  { "name": "Honduras", "code": "HN" },
  { "name": "Hongrie", "code": "HU" },
  { "name": "Îles Cook", "code": "CK" },
  { "name": "Îles Marshall", "code": "MH" },
  { "name": "Îles Salomon", "code": "SB" },
  { "name": "Inde", "code": "IN" },
  { "name": "Indonésie", "code": "ID" },
  { "name": "Irak", "code": "IQ" },
  { "name": "Iran", "code": "IR" },
  { "name": "Irlande", "code": "IE" },
  { "name": "Islande", "code": "IS" },
  { "name": "Israël", "code": "IL" },
  { "name": "Italie", "code": "IT" },
  { "name": "Jamaïque", "code": "JM" },
  { "name": "Japon", "code": "JP" },
  { "name": "Jordanie", "code": "JO" },
  { "name": "Kazakhstan", "code": "KZ" },
  { "name": "Kenya", "code": "KE" },
  { "name": "Kirghizistan", "code": "KG" },
  { "name": "Kiribati", "code": "KI" },
  { "name": "Koweït", "code": "KW" },
  { "name": "Laos", "code": "LA" },
  { "name": "Lesotho", "code": "LS" },
  { "name": "Lettonie", "code": "LV" },
  { "name": "Liban", "code": "LB" },
  { "name": "Liberia", "code": "LR" },
  { "name": "Libye", "code": "LY" },
  { "name": "Liechtenstein", "code": "LI" },
  { "name": "Lituanie", "code": "LT" },
  { "name": "Luxembourg", "code": "LU" },
  { "name": "Macédoine du Nord", "code": "MK" },
  { "name": "Madagascar", "code": "MG" },
  { "name": "Malaisie", "code": "MY" },
  { "name": "Malawi", "code": "MW" },
  { "name": "Maldives", "code": "MV" },
  { "name": "Mali", "code": "ML" },
  { "name": "Malte", "code": "MT" },
  { "name": "Maroc", "code": "MA" },
  { "name": "Maurice", "code": "MU" },
  { "name": "Mauritanie", "code": "MR" },
  { "name": "Mexique", "code": "MX" },
  { "name": "Micronésie", "code": "FM" },
  { "name": "Moldavie", "code": "MD" },
  { "name": "Monaco", "code": "MC" },
  { "name": "Mongolie", "code": "MN" },
  { "name": "Monténégro", "code": "ME" },
  { "name": "Mozambique", "code": "MZ" },
  { "name": "Namibie", "code": "NA" },
  { "name": "Nauru", "code": "NR" },
  { "name": "Népal", "code": "NP" },
  { "name": "Nicaragua", "code": "NI" },
  { "name": "Niger", "code": "NE" },
  { "name": "Nigeria", "code": "NG" },
  { "name": "Niue", "code": "NU" },
  { "name": "Norvège", "code": "NO" },
  { "name": "Nouvelle-Zélande", "code": "NZ" },
  { "name": "Oman", "code": "OM" },
  { "name": "Ouganda", "code": "UG" },
  { "name": "Ouzbékistan", "code": "UZ" },
  { "name": "Pakistan", "code": "PK" },
  { "name": "Palaos", "code": "PW" },
  { "name": "Palestine", "code": "PS" },
  { "name": "Panama", "code": "PA" },
  { "name": "Papouasie-Nouvelle-Guinée", "code": "PG" },
  { "name": "Paraguay", "code": "PY" },
  { "name": "Pays-Bas", "code": "NL" },
  { "name": "Pérou", "code": "PE" },
  { "name": "Philippines", "code": "PH" },
  { "name": "Pologne", "code": "PL" },
  { "name": "Portugal", "code": "PT" },
  { "name": "Qatar", "code": "QA" },
  { "name": "République centrafricaine", "code": "CF" },
  { "name": "République démocratique du Congo", "code": "CD" },
  { "name": "République dominicaine", "code": "DO" },
  { "name": "République du Congo", "code": "CG" },
  { "name": "République tchèque", "code": "CZ" },
  { "name": "Roumanie", "code": "RO" },
  { "name": "Royaume-Uni", "code": "GB" },
  { "name": "Russie", "code": "RU" },
  { "name": "Rwanda", "code": "RW" },
  { "name": "Saint-Christophe-et-Niévès", "code": "KN" },
  { "name": "Saint-Marin", "code": "SM" },
  { "name": "Saint-Vincent-et-les-Grenadines", "code": "VC" },
  { "name": "Sainte-Lucie", "code": "LC" },
  { "name": "Salvador", "code": "SV" },
  { "name": "Samoa", "code": "WS" },
  { "name": "Sao Tomé-et-Principe", "code": "ST" },
  { "name": "Sénégal", "code": "SN" },
  { "name": "Serbie", "code": "RS" },
  { "name": "Seychelles", "code": "SC" },
  { "name": "Sierra Leone", "code": "SL" },
  { "name": "Singapour", "code": "SG" },
  { "name": "Slovaquie", "code": "SK" },
  { "name": "Slovénie", "code": "SI" },
  { "name": "Somalie", "code": "SO" },
  { "name": "Soudan", "code": "SD" },
  { "name": "Soudan du Sud", "code": "SS" },
  { "name": "Sri Lanka", "code": "LK" },
  { "name": "Suède", "code": "SE" },
  { "name": "Suisse", "code": "CH" },
  { "name": "Suriname", "code": "SR" },
  { "name": "Syrie", "code": "SY" },
  { "name": "Tadjikistan", "code": "TJ" },
  { "name": "Tanzanie", "code": "TZ" },
  { "name": "Tchad", "code": "TD" },
  { "name": "Thaïlande", "code": "TH" },
  { "name": "Timor oriental", "code": "TL" },
  { "name": "Togo", "code": "TG" },
  { "name": "Tonga", "code": "TO" },
  { "name": "Trinité-et-Tobago", "code": "TT" },
  { "name": "Tunisie", "code": "TN" },
  { "name": "Turkménistan", "code": "TM" },
  { "name": "Turquie", "code": "TR" },
  { "name": "Tuvalu", "code": "TV" },
  { "name": "Ukraine", "code": "UA" },
  { "name": "Uruguay", "code": "UY" },
  { "name": "Vanuatu", "code": "VU" },
  { "name": "Vatican", "code": "VA" },
  { "name": "Venezuela", "code": "VE" },
  { "name": "Viêt Nam", "code": "VN" },
  { "name": "Yémen", "code": "YE" },
  { "name": "Zambie", "code": "ZM" },
  { "name": "Zimbabwe", "code": "ZW" }
]
  $$::jsonb AS data
)
INSERT INTO public.countries (code_iso2, name)
SELECT upper(elem->>'code'), elem->>'name'
FROM payload,
LATERAL jsonb_array_elements(payload.data) AS elem
ON CONFLICT (code_iso2) DO UPDATE
  SET name = EXCLUDED.name;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS country_code_ref CHAR(2);

UPDATE public.profiles
SET country_code_ref = upper(trim(country_code))
WHERE country_code IS NOT NULL
  AND trim(country_code) <> ''
  AND country_code_ref IS NULL;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_country_code_ref_fk
  FOREIGN KEY (country_code_ref) REFERENCES public.countries (code_iso2)
  ON UPDATE CASCADE
  ON DELETE SET NULL;

DROP FUNCTION IF EXISTS public.sync_profile_country_codes() CASCADE;

CREATE FUNCTION public.sync_profile_country_codes()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  normalized TEXT;
BEGIN
  IF NEW.country_code_ref IS NULL AND NEW.country_code IS NULL THEN
    RETURN NEW;
  END IF;

  normalized := upper(substr(coalesce(NEW.country_code_ref, NEW.country_code), 1, 2));

  IF NEW.country_code_ref IS NULL THEN
    NEW.country_code_ref := normalized;
  END IF;

  IF NEW.country_code IS NULL THEN
    NEW.country_code := normalized;
  END IF;

  IF upper(substr(NEW.country_code, 1, 2)) <> normalized THEN
    RAISE EXCEPTION 'country_code (%s) and country_code_ref (%s) doivent être identiques (normalisé: %s)', NEW.country_code, NEW.country_code_ref, normalized;
  END IF;

  NEW.country_code_ref := normalized;
  NEW.country_code := normalized;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_profile_country_codes ON public.profiles;

CREATE TRIGGER sync_profile_country_codes
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_profile_country_codes();

COMMIT;
