import type { OperationConfig } from '../../../domain/types';
import { HotelForm } from './HotelForm';
import { VillasForm } from './VillasForm';
import { RestaurantForm } from './RestaurantForm';
import { BeachClubForm } from './BeachClubForm';
import { RacquetForm } from './RacquetForm';
import { RetailForm } from './RetailForm';
import { FlexForm } from './FlexForm';
import { WellnessForm } from './WellnessForm';
import { SeniorLivingForm } from './SeniorLivingForm';

interface OperationDriversFormProps {
  operation: OperationConfig;
  onChange?: (updates: Partial<OperationConfig>) => void;
  readOnly?: boolean;
}

export function OperationDriversForm({
  operation,
  onChange,
  readOnly = false,
}: OperationDriversFormProps) {
  switch (operation.operationType) {
    case 'HOTEL':
      return <HotelForm operation={operation} onChange={onChange} readOnly={readOnly} />;
    case 'VILLAS':
      return <VillasForm operation={operation} onChange={onChange} readOnly={readOnly} />;
    case 'RESTAURANT':
      return <RestaurantForm operation={operation} onChange={onChange} readOnly={readOnly} />;
    case 'BEACH_CLUB':
      return <BeachClubForm operation={operation} onChange={onChange} readOnly={readOnly} />;
    case 'RACQUET':
      return <RacquetForm operation={operation} onChange={onChange} readOnly={readOnly} />;
    case 'RETAIL':
      return <RetailForm operation={operation} onChange={onChange} readOnly={readOnly} />;
    case 'FLEX':
      return <FlexForm operation={operation} onChange={onChange} readOnly={readOnly} />;
    case 'WELLNESS':
      return <WellnessForm operation={operation} onChange={onChange} readOnly={readOnly} />;
    case 'SENIOR_LIVING':
      return <SeniorLivingForm operation={operation} onChange={onChange} readOnly={readOnly} />;
    default: {
      const operationType = (operation as OperationConfig).operationType;
      return (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          Operational drivers form for {operationType} coming soon
        </div>
      );
    }
  }
}
