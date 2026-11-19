import { Icon } from '@/components/ui/Icon';
import { colors } from '@/theme';

export function VerifiedBadge({ size = 22 }: { size?: number }) {
  return <Icon name="check-decagram" size={size} color={colors.sky} />;
}
