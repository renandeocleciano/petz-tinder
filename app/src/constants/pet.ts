import type { IconName } from '@/components/ui/Icon';
import type { Tone } from '@/theme';
import type { Interest, PersonalityTrait, PetGender, PetSize, Species } from '@/types/domain';

interface Option<T extends string> {
  value: T;
  label: string;
  icon: IconName;
}

interface TonedOption<T extends string> extends Option<T> {
  tone: Tone;
}

export const SPECIES_OPTIONS: Option<Species>[] = [
  { value: 'dog', label: 'Cachorro', icon: 'dog' },
  { value: 'cat', label: 'Gato', icon: 'cat' },
  { value: 'other', label: 'Outro', icon: 'paw' },
];

export const SIZE_OPTIONS: Option<PetSize>[] = [
  { value: 'small', label: 'Pequeno', icon: 'dog-side' },
  { value: 'medium', label: 'Médio', icon: 'dog-side' },
  { value: 'large', label: 'Grande', icon: 'dog-side' },
];

export const GENDER_OPTIONS: Option<PetGender>[] = [
  { value: 'male', label: 'Macho', icon: 'gender-male' },
  { value: 'female', label: 'Fêmea', icon: 'gender-female' },
];

export const TRAIT_OPTIONS: TonedOption<PersonalityTrait>[] = [
  { value: 'playful', label: 'Brincalhão', icon: 'tennis-ball', tone: 'orange' },
  { value: 'calm', label: 'Calmo', icon: 'spa-outline', tone: 'neutral' },
  { value: 'sociable', label: 'Sociável', icon: 'account-group', tone: 'teal' },
  { value: 'loves_park', label: 'Ama parque', icon: 'pine-tree', tone: 'sky' },
  { value: 'energetic', label: 'Energético', icon: 'lightning-bolt', tone: 'coral' },
  { value: 'shy', label: 'Tímido', icon: 'emoticon-happy-outline', tone: 'lavender' },
];

export const INTEREST_OPTIONS: TonedOption<Interest>[] = [
  { value: 'play', label: 'Brincar', icon: 'tennis-ball', tone: 'orange' },
  { value: 'walks', label: 'Passeios', icon: 'pine-tree', tone: 'teal' },
  { value: 'beach', label: 'Praia', icon: 'waves', tone: 'sky' },
  { value: 'treats', label: 'Petiscos', icon: 'bone', tone: 'orange' },
  { value: 'other_pets', label: 'Outros pets', icon: 'account-group', tone: 'lavender' },
  { value: 'adventures', label: 'Aventuras', icon: 'terrain', tone: 'teal' },
];

export const AGE_OPTIONS = Array.from({ length: 21 }, (_, years) => years);

const byValue = <O extends { value: string }>(options: O[]) =>
  Object.fromEntries(options.map((option) => [option.value, option])) as Record<O['value'], O>;

export const SPECIES_BY_VALUE = byValue(SPECIES_OPTIONS);
export const SIZE_BY_VALUE = byValue(SIZE_OPTIONS);
export const GENDER_BY_VALUE = byValue(GENDER_OPTIONS);
export const TRAIT_BY_VALUE = byValue(TRAIT_OPTIONS);
export const INTEREST_BY_VALUE = byValue(INTEREST_OPTIONS);

export const BREED_SUGGESTIONS: Record<Species, string[]> = {
  dog: [
    'SRD (vira-lata)',
    'Golden Retriever',
    'Labrador',
    'Border Collie',
    'Bulldog Francês',
    'Shih Tzu',
    'Poodle',
    'Pug',
    'Beagle',
    'Maltês',
    'Cocker Spaniel',
    'Yorkshire',
    'Dachshund',
    'Spitz Alemão',
  ],
  cat: ['SRD (vira-lata)', 'Siamês', 'Persa', 'Maine Coon', 'Angorá', 'Bengal', 'Sphynx'],
  other: ['Coelho', 'Hamster', 'Porquinho-da-índia', 'Outro'],
};

/** When the pet is usually free for a playdate. `detail` is used when the tutor writes none. */
export const AVAILABILITY_OPTIONS: { title: string; detail: string; icon: IconName }[] = [
  { title: 'Manhãs', detail: 'Antes do meio-dia', icon: 'weather-sunset-up' },
  { title: 'Tardes', detail: 'Das 12h às 18h', icon: 'weather-sunny' },
  { title: 'Noites', detail: 'Depois das 18h', icon: 'weather-night' },
  { title: 'Dias úteis', detail: 'Segunda a sexta', icon: 'calendar-week' },
  { title: 'Fins de semana', detail: 'Sábados e domingos', icon: 'calendar-weekend' },
  { title: 'Flexível', detail: 'Qualquer horário', icon: 'calendar-check' },
];

/** Quick picks for "Preferências"; tutors can also write their own. */
export const PREFERENCE_SUGGESTIONS = [
  'Pets de porte pequeno',
  'Pets de porte médio',
  'Pets de porte grande',
  'Pets calmos',
  'Pets brincalhões',
  'Encontros no parque',
  'Passeios em grupo',
];
