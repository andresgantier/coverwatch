# Data model

CoverWatch stores master data (customers, sites, equipment, users), maintenance contracts and the work done under them (service requests and preventive visits). All rules that must never be broken live in PostgreSQL as constraints.

## Entity-relationship diagram

```mermaid
erDiagram
    customers ||--o{ sites : "has"
    sites ||--o{ equipment : "hosts"
    customers ||--o{ contracts : "signs"
    contracts ||--o| contracts : "renewed as"
    contracts ||--o{ contract_equipment : "covers"
    equipment ||--o{ contract_equipment : "covered by"
    equipment ||--o{ service_requests : "breaks down"
    contracts |o--o{ service_requests : "applies SLA to"
    contracts ||--o{ preventive_visits : "promises"
    profiles |o--o{ service_requests : "assigned to"
    profiles |o--o{ preventive_visits : "assigned to"

    customers {
        uuid id PK
        text customer_number UK
        text name UK
        customer_segment segment
        boolean is_active
    }
    sites {
        uuid id PK
        uuid customer_id FK
        text name
        text street
        text postal_code
        text city
    }
    equipment {
        uuid id PK
        uuid site_id FK
        text serial_number UK
        equipment_type equipment_type
        numeric cooling_capacity_kw
        date install_date
        date warranty_end_date
        equipment_status status
    }
    contracts {
        uuid id PK
        text contract_number UK
        uuid customer_id FK
        contract_type contract_type
        contract_status status
        date start_date
        date end_date
        int notice_period_days
        boolean auto_renew
        numeric annual_value_eur
        int sla_p1_hours
        int sla_p2_hours
        int sla_p3_hours
        int preventive_visits_per_year
        uuid previous_contract_id FK
    }
    contract_equipment {
        uuid contract_id PK
        uuid equipment_id PK
        daterange coverage
        boolean is_active_contract
    }
    service_requests {
        uuid id PK
        text ticket_number UK
        uuid equipment_id FK
        timestamptz reported_at
        ticket_priority priority
        ticket_status status
        uuid assigned_technician_id FK
        timestamptz first_response_at
        timestamptz resolved_at
        timestamptz failure_start
        timestamptz failure_end
        uuid covering_contract_id FK
        int sla_hours
    }
    preventive_visits {
        uuid id PK
        uuid contract_id FK
        int visit_number
        date due_date
        date scheduled_date
        uuid assigned_technician_id FK
        visit_status status
        date actual_date
        visit_result result
    }
    profiles {
        uuid id PK
        text full_name
        text email UK
        user_role role
        boolean is_active
    }
    audit_log {
        bigint id PK
        text table_name
        uuid record_id
        text action
        uuid changed_by
        timestamptz changed_at
        jsonb old_data
        jsonb new_data
    }
```

`audit_log` has no foreign keys on purpose: history must survive even if a referenced row changes.

## Tables

| Table | Purpose |
|---|---|
| `customers` | B2B customers. `customer_number` is generated (C-0001). |
| `sites` | Customer buildings where equipment is installed. |
| `equipment` | Installed units with serial number, type, capacity and warranty. |
| `profiles` | App users linked to Supabase Auth, with their role. Technicians are profiles with `role = technician`. |
| `contracts` | Maintenance contracts. Never deleted: they change status or are renewed as a new row linked through `previous_contract_id`. |
| `contract_equipment` | Which units each contract covers (many-to-many). |
| `service_requests` | Breakdown tickets. `ticket_number` is generated (SR-000001). |
| `preventive_visits` | One row per promised preventive visit of a contract. |
| `audit_log` | Change history for contracts and tickets (filled by triggers in Phase 2). |

## Key rules enforced by the database

| Rule | How |
|---|---|
| A unit cannot be in two ACTIVE contracts with overlapping dates | `EXCLUDE USING gist (equipment_id WITH =, coverage WITH &&) WHERE (is_active_contract)` on `contract_equipment` |
| Contract ends after it starts; notice period shorter than the contract | `CHECK` on `contracts` |
| SLA hours: P1 ≤ P2 ≤ P3 | `CHECK` on `contracts` |
| A terminated contract needs a date and a reason | `CHECK` on `contracts` |
| A contract can be renewed only once (one successor) | `UNIQUE (previous_contract_id)` |
| First response and resolution cannot be before the report | `CHECK` on `service_requests` |
| RESOLVED ⇔ resolution time is set | `CHECK` on `service_requests` |
| A ticket has an SLA only if it is linked to a covering contract | `CHECK` on `service_requests` |
| A visit is DONE ⇔ it has an actual date and a result | `CHECK` on `preventive_visits` |
| Unique serial numbers, contract numbers, customer names | `UNIQUE` |
| German postal codes (5 digits), valid e-mail format | `CHECK` with regular expressions |

### Why `contract_equipment` copies the contract period and status
An `EXCLUDE` constraint can only compare columns of one table. The contract period (`coverage`) and whether the contract is active (`is_active_contract`) are therefore copied onto each link row. Two triggers keep the copy in sync: when a unit is linked, and when a contract's dates or status change. That second trigger means activating a contract re-checks the rule, so a DRAFT can overlap, but it cannot be activated while the unit is still covered elsewhere.

### Calculated, not stored
- "Expiring soon" status, decision deadline (`end_date − notice_period_days`), SLA met / breached, overdue visits, availability and billable tickets are calculated in views (Phase 2), not stored.

## Security
Row Level Security is enabled on every table. Until Phase 2 adds role-based policies, the API returns no rows to anyone.

## Verification
- `supabase/verification/phase1_structure.sql`: tables, columns, constraints, indexes and RLS status.
- `supabase/verification/phase1_checks.sql`: 14 valid and invalid inserts; each must be accepted or rejected as expected. All test data is rolled back.
