import { ensureArray as ensureArrayShared } from '../layoutRegistry.shared';

export const createOnFieldChange = (value, onChange) => (field) => (nextValue) => {
  onChange({
    ...value,
    [field]: nextValue,
  });
};

export const createInputChangeHandler = (value, onChange) => (field) => (event) => {
  const nextValue = event?.target?.type === 'number' ? event.target.valueAsNumber : event.target.value;
  onChange({
    ...value,
    [field]: nextValue,
  });
};

export const createBooleanToggleHandler = (value, onChange) => (field) => (nextValue) => {
  onChange({
    ...value,
    [field]: Boolean(nextValue),
  });
};

export const ensureArray = ensureArrayShared;
