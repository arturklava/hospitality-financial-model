import type { OperationConfig } from '../../domain/types';
import type { TranslationKey } from '../../i18n/translations';

type Translator = (key: TranslationKey) => string;

export type OperationTypeKey = OperationConfig['operationType'];

export const OPERATION_TYPE_TRANSLATIONS: Record<OperationTypeKey, TranslationKey> = {
  HOTEL: 'operations.types.hotel',
  VILLAS: 'operations.types.villas',
  RESTAURANT: 'operations.types.restaurant',
  BEACH_CLUB: 'operations.types.beachClub',
  RACQUET: 'operations.types.racquet',
  RETAIL: 'operations.types.retail',
  FLEX: 'operations.types.flex',
  WELLNESS: 'operations.types.wellness',
  SENIOR_LIVING: 'operations.types.seniorLiving',
};

export const operationTypeOptions = (Object.keys(OPERATION_TYPE_TRANSLATIONS) as OperationTypeKey[]).map(
  (operationType) => ({
    value: operationType,
    translationKey: OPERATION_TYPE_TRANSLATIONS[operationType],
  })
);

export const getOperationTypeLabel = (
  t: Translator,
  operationType: string
): string => {
  const translationKey = OPERATION_TYPE_TRANSLATIONS[operationType as OperationTypeKey];
  if (translationKey) {
    return t(translationKey);
  }

  return operationType
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
};
