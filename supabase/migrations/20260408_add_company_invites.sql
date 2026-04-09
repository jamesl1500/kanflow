-- Company invites support username/email invite workflows.
create table if not exists public.company_invites (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    invited_email text not null,
    invited_by_user_id uuid not null references auth.users(id) on delete cascade,
    role text not null default 'member' check (role in ('admin', 'member')),
    status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked', 'expired')),
    invite_token uuid not null default gen_random_uuid() unique,
    accepted_by_user_id uuid references auth.users(id) on delete set null,
    accepted_at timestamptz,
    expires_at timestamptz not null default (now() + interval '14 days'),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_company_invites_company_status
    on public.company_invites (company_id, status);

create index if not exists idx_company_invites_email_status
    on public.company_invites (invited_email, status);

create unique index if not exists uq_company_invites_pending_company_email
    on public.company_invites (company_id, invited_email)
    where status = 'pending';

alter table public.company_invites enable row level security;

drop policy if exists "company_invites_select_by_membership_or_email" on public.company_invites;
create policy "company_invites_select_by_membership_or_email"
    on public.company_invites
    for select
    using (
        exists (
            select 1
            from public.company_members cm
            where cm.company_id = company_invites.company_id
                and cm.user_id = auth.uid()
        )
        or lower(company_invites.invited_email) = lower(coalesce(auth.jwt()->>'email', ''))
    );

drop policy if exists "company_invites_insert_by_admins" on public.company_invites;
create policy "company_invites_insert_by_admins"
    on public.company_invites
    for insert
    with check (
        company_invites.invited_by_user_id = auth.uid()
        and exists (
            select 1
            from public.company_members cm
            where cm.company_id = company_invites.company_id
                and cm.user_id = auth.uid()
                and cm.role in ('owner', 'admin')
        )
    );

drop policy if exists "company_invites_update_by_admins" on public.company_invites;
create policy "company_invites_update_by_admins"
    on public.company_invites
    for update
    using (
        exists (
            select 1
            from public.company_members cm
            where cm.company_id = company_invites.company_id
                and cm.user_id = auth.uid()
                and cm.role in ('owner', 'admin')
        )
        or lower(company_invites.invited_email) = lower(coalesce(auth.jwt()->>'email', ''))
    )
    with check (
        (
            exists (
                select 1
                from public.company_members cm
                where cm.company_id = company_invites.company_id
                    and cm.user_id = auth.uid()
                    and cm.role in ('owner', 'admin')
            )
        )
        or (
            lower(company_invites.invited_email) = lower(coalesce(auth.jwt()->>'email', ''))
            and company_invites.status = 'accepted'
            and company_invites.accepted_by_user_id = auth.uid()
            and company_invites.accepted_at is not null
        )
    );

drop policy if exists "company_invites_delete_by_admins" on public.company_invites;
create policy "company_invites_delete_by_admins"
    on public.company_invites
    for delete
    using (
        exists (
            select 1
            from public.company_members cm
            where cm.company_id = company_invites.company_id
                and cm.user_id = auth.uid()
                and cm.role in ('owner', 'admin')
        )
    );
