create function private.require_demo_auth_identity() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.email is null or new.email !~* '^[^[:space:]@]+@example[.]test$' or nullif(new.phone, '') is not null then
    raise exception 'This coursework project only accepts fictional demo identities' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function private.require_demo_auth_identity() from public, anon, authenticated;
create trigger require_demo_auth_identity before insert or update of email, phone on auth.users
  for each row execute function private.require_demo_auth_identity();
