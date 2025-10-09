import { ensureArray as ensureArrayShared } from '../layoutRegistry.shared';

export const createOnFieldChange = (_value, onChange) => (field) => (nextValue) => {
  onChange((current) => ({
    ...(current ?? {}),
    [field]: nextValue,
  }));
};

export const createInputChangeHandler = (_value, onChange) => (field) => (event) => {
  const rawValue =
    event && typeof event === 'object' && 'target' in event
      ? event.target?.type === 'number'
        ? event.target.valueAsNumber
        : event.target.value
      : event;

  onChange((current) => ({
    ...(current ?? {}),
    [field]: rawValue,
  }));
};

export const createBooleanToggleHandler = (_value, onChange) => (field) => (nextValue) => {
  onChange((current) => ({
    ...(current ?? {}),
    [field]: Boolean(nextValue),
  }));
};

export const ensureArray = ensureArrayShared;

export const ensureStringField = (value, fallback = '') =>
  typeof value === 'string' ? value : fallback;
