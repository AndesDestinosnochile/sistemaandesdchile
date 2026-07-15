-- 0004_delete_cascade_and_policies.sql
-- Objetivo:
--  1) Ao excluir um cliente, remover em cascata todas as reservas (e por
--     consequência: reservation_tours, payments, documents, contracts —
--     que já têm ON DELETE CASCADE em reservations).
--  2) Permitir que o vendedor (seller) exclua a própria reserva; hoje
--     apenas admin conseguia deletar, o que fazia o botão "falhar em silêncio"
--     por causa de RLS.
--  3) Permitir que o criador (created_by) exclua o próprio cliente.

-- 1) FK reservations.customer_id: restrict -> cascade
alter table public.reservations
  drop constraint if exists reservations_customer_id_fkey;

alter table public.reservations
  add constraint reservations_customer_id_fkey
  foreign key (customer_id) references public.customers(id) on delete cascade;

-- 2) Reservations: permitir delete para admin OU seller dono
drop policy if exists "reservations: admin delete" on public.reservations;
drop policy if exists "reservations: delete" on public.reservations;
create policy "reservations: delete" on public.reservations
  for delete to authenticated
  using (public.is_admin(auth.uid()) or seller_id = auth.uid());

-- 3) Customers: permitir delete para admin OU criador
drop policy if exists "customers: admin delete" on public.customers;
drop policy if exists "customers: delete" on public.customers;
create policy "customers: delete" on public.customers
  for delete to authenticated
  using (public.is_admin(auth.uid()) or created_by = auth.uid());
