-- Enhance kanban cards for richer task management.
alter table public.kanban_cards
    add column if not exists status text not null default 'todo',
    add column if not exists estimate_points integer,
    add column if not exists tags text[] not null default '{}',
    add column if not exists started_at timestamptz,
    add column if not exists completed_at timestamptz,
    add column if not exists archived_at timestamptz;

-- Keep status constrained and predictable.
do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname = 'kanban_cards_status_check'
    ) then
        alter table public.kanban_cards
            add constraint kanban_cards_status_check
            check (status in ('todo', 'in_progress', 'blocked', 'review', 'done'));
    end if;
end $$;

create index if not exists idx_kanban_cards_workspace_status
    on public.kanban_cards (workspace_id, status);

create index if not exists idx_kanban_cards_due_date
    on public.kanban_cards (due_date)
    where due_date is not null;

create index if not exists idx_kanban_cards_tags
    on public.kanban_cards using gin (tags);

create table if not exists public.kanban_subtasks (
    id uuid primary key default gen_random_uuid(),
    card_id uuid not null references public.kanban_cards(id) on delete cascade,
    title text not null,
    is_completed boolean not null default false,
    position integer not null default 0,
    due_date timestamptz,
    completed_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_kanban_subtasks_card_position
    on public.kanban_subtasks (card_id, position);

create index if not exists idx_kanban_subtasks_due_date
    on public.kanban_subtasks (due_date)
    where due_date is not null;

create index if not exists idx_kanban_subtasks_open
    on public.kanban_subtasks (card_id, is_completed);
