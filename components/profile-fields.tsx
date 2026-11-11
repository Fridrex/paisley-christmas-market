'use client';

import { applicationFields, type FieldErrors, type ProfileDraft } from '@/lib/applications';
import { categories } from '@/lib/market-data';

type Field = keyof ProfileDraft;

export const ProfileFields = ({ draft, errors, update, firstField }: {
  draft: ProfileDraft;
  errors?: FieldErrors;
  update: (field: Field, value: string) => void;
  firstField?: React.Ref<HTMLInputElement>;
}) => {
  const control = (field: Field) => {
    return {
      id: field, name: field, value: draft[field], required: true,
      'aria-invalid': errors?.[field] ? true : undefined,
      'aria-describedby': errors?.[field] ? `${field}-error` : undefined,
      onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        update(field, event.target.value);
      },
    };
  };

  const fieldError = (field: Field) => {
    return errors?.[field] && <span className="field-error" id={`${field}-error`}>{errors[field]}</span>;
  };

  return (
    <>
      <div className="form-field">
        <label htmlFor="business_name">{applicationFields.business_name}</label>
        <input {...control('business_name')} ref={firstField} minLength={2} maxLength={60} autoComplete="organization" />
        {fieldError('business_name')}
      </div>
      <div className="form-field">
        <label htmlFor="category">{applicationFields.category}</label>
        <select {...control('category')}>
          <option value="">Choose a category</option>
          {categories.map((category) => <option key={category}>{category}</option>)}
        </select>
        {fieldError('category')}
      </div>
      <div className="form-field">
        <label htmlFor="description">{applicationFields.description}</label>
        <textarea {...control('description')} minLength={10} maxLength={500} />
        {fieldError('description')}
      </div>
      <div className="form-field">
        <label htmlFor="contact_email">{applicationFields.contact_email}</label>
        <input {...control('contact_email')} type="email" maxLength={254} autoComplete="email" />
        {fieldError('contact_email')}
      </div>
    </>
  );
};
