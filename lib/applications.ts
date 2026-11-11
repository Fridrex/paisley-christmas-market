import { categories, type Category } from './market-data';

export const applicationStatuses = {
  submitted: 'Submitted',
  under_review: 'Under review',
  declined: 'Declined',
};
export type ApplicationStatus = keyof typeof applicationStatuses;
export type Application = {
  id: string;
  period_slug: string;
  business_name: string;
  category: Category;
  description: string;
  contact_email: string;
  status: ApplicationStatus;
  decision_note: string | null;
  created_at: string;
};

export const applicationColumns = 'id,period_slug,business_name,category,description,contact_email,status,decision_note,created_at';
export const applicationFields = {
  business_name: 'Business name',
  category: 'Business category',
  description: 'What do you sell?',
  contact_email: 'Contact email address',
  period: 'Trading weekend',
};
export type ApplicationField = keyof typeof applicationFields;
export type ApplicationDraft = Record<ApplicationField, string>;
export type FieldErrors = Partial<Record<ApplicationField, string>>;
export type ApplicationState = { error?: string; fields?: FieldErrors };
export type ProfileDraft = Omit<ApplicationDraft, 'period'>;

export const readProfile = (form: FormData) => {
  const draft: ProfileDraft = {
    business_name: String(form.get('business_name') ?? '').trim(),
    category: String(form.get('category') ?? '').trim(),
    description: String(form.get('description') ?? '').trim(),
    contact_email: String(form.get('contact_email') ?? '').trim(),
  };
  const errors: FieldErrors = {};
  const category = categories.find((item) => item === draft.category);
  if (draft.business_name.length < 2 || draft.business_name.length > 60) {
    errors.business_name = 'Enter a business name between 2 and 60 characters.';
  }
  if (!category) errors.category = 'Choose a business category.';
  if (draft.description.length < 10 || draft.description.length > 500) {
    errors.description = 'Describe what you sell in 10 to 500 characters.';
  }
  if (draft.contact_email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.contact_email)) {
    errors.contact_email = 'Enter a valid contact email address.';
  }
  return { draft, category, errors };
};
