/**
 * Public component barrel. Module agents import shared UI from here:
 *   import { DataTable, FormDialog, AddButton, ... } from '@/components';
 * See client/CONTRACTS.md for the authoritative prop signatures.
 */
export { AppHeader } from './AppHeader';
export { TabNav, SECTION_TABS } from './TabNav';
export type { SectionTab, TabNavProps } from './TabNav';

export { DataTable } from './DataTable';
export type { DataTableProps, Column } from './DataTable';

export { Button, AddButton, FilterButton } from './Buttons';
export type {
  ButtonProps,
  ButtonVariant,
  AddButtonProps,
  FilterButtonProps,
} from './Buttons';

export { FormDialog } from './FormDialog';
export type { FormDialogProps } from './FormDialog';

export { ConfirmDialog } from './ConfirmDialog';
export type { ConfirmDialogProps } from './ConfirmDialog';

export { Spinner } from './Spinner';
export type { SpinnerProps } from './Spinner';

export { ToastProvider, useToast } from './Toast';
export type { ToastApi, ToastSeverity, ToastOptions } from './Toast';

export {
  TextField,
  PasswordField,
  TextAreaField,
  SelectField,
} from './fields/Fields';
export type {
  TextFieldProps,
  PasswordFieldProps,
  TextAreaFieldProps,
  SelectFieldProps,
  SelectOption,
} from './fields/Fields';

export {
  SwitchField,
  CheckboxField,
  DateField,
  FileField,
} from './fields/MoreFields';
export type {
  SwitchFieldProps,
  CheckboxFieldProps,
  DateFieldProps,
  FileFieldProps,
} from './fields/MoreFields';

export { AutocompleteField } from './fields/AutocompleteField';
export type {
  AutocompleteFieldProps,
  AutocompleteOption,
} from './fields/AutocompleteField';
