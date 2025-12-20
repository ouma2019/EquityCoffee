-- =========================================================
-- Equity Coffee – PostgreSQL schema (WORKING)
-- Matches backend routes: auth, farmer, trader, roaster, logistics, marketplace
-- =========================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Drop in dependency order
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS roaster_inventory CASCADE;
DROP TABLE IF EXISTS shipments CASCADE;
DROP TABLE IF EXISTS contracts CASCADE;
DROP TABLE IF EXISTS offers CASCADE;
DROP TABLE IF EXISTS quality_reports CASCADE;
DROP TABLE IF EXISTS lot_photos CASCADE;
DROP TABLE IF EXISTS coffee_lots CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- =========================
-- USERS
-- =========================
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           VARCHAR(255) UNIQUE NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,
  role            VARCHAR(50) NOT NULL CHECK (role IN ('farmer','trader','logistics','roaster','admin','educator')),
  first_name      VARCHAR(100),
  last_name       VARCHAR(100),
  company_name    VARCHAR(255),
  phone           VARCHAR(50),
  country         VARCHAR(100),
  is_verified     BOOLEAN DEFAULT FALSE,
  last_login_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  VARCHAR(255) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at  TIMESTAMPTZ
);

CREATE INDEX idx_user_sessions_user_expires ON user_sessions(user_id, expires_at);

-- =========================
-- FARMER: COFFEE LOTS
-- =========================
CREATE TABLE coffee_lots (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  lot_name         VARCHAR(255) NOT NULL,
  crop_year        INTEGER NOT NULL CHECK (crop_year BETWEEN 2000 AND 2100),

  country          VARCHAR(100) NOT NULL,
  region           VARCHAR(150),
  altitude_meters  INTEGER CHECK (altitude_meters BETWEEN 0 AND 10000),

  grade            VARCHAR(20),
  certification    VARCHAR(100),
  process          VARCHAR(50),
  variety          VARCHAR(255),

  harvest_month    DATE,
  ready_location   VARCHAR(255),
  tasting_notes    TEXT,

  bags_available   INTEGER NOT NULL DEFAULT 0 CHECK (bags_available >= 0),
  bag_size_kg      INTEGER DEFAULT 60 CHECK (bag_size_kg > 0),
  cup_score        NUMERIC(4,1) CHECK (cup_score BETWEEN 0 AND 100),

  price_per_kg     NUMERIC(12,2),
  currency         VARCHAR(10) DEFAULT 'USD',

  status           VARCHAR(30) NOT NULL DEFAULT 'draft'
                   CHECK (status IN ('draft','published','hidden','booked','sold')),
  visibility       VARCHAR(30) NOT NULL DEFAULT 'public'
                   CHECK (visibility IN ('public','private')),

  views_this_week  INTEGER DEFAULT 0,
  enquiries_count  INTEGER DEFAULT 0,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_coffee_lots_farmer_status ON coffee_lots(farmer_id, status);
CREATE INDEX idx_coffee_lots_country ON coffee_lots(country);
CREATE INDEX idx_coffee_lots_status_visibility ON coffee_lots(status, visibility);

-- =========================
-- LOT MEDIA + QUALITY
-- =========================
CREATE TABLE lot_photos (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id     UUID NOT NULL REFERENCES coffee_lots(id) ON DELETE CASCADE,
  url        TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE quality_reports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id      UUID NOT NULL REFERENCES coffee_lots(id) ON DELETE CASCADE,
  report_type VARCHAR(50),
  score       NUMERIC(4,1),
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- TRADER: OFFERS
-- =========================
CREATE TABLE offers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id       UUID NOT NULL REFERENCES coffee_lots(id) ON DELETE CASCADE,
  buyer_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  price_per_kg NUMERIC(12,2) NOT NULL CHECK (price_per_kg >= 0),
  currency     VARCHAR(10) NOT NULL DEFAULT 'USD',
  incoterm     VARCHAR(20),
  message      TEXT,
  status       VARCHAR(30) NOT NULL DEFAULT 'submitted'
               CHECK (status IN ('submitted','accepted','rejected','withdrawn')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_offers_lot_id ON offers(lot_id);
CREATE INDEX idx_offers_buyer_id ON offers(buyer_id);

-- =========================
-- CONTRACTS
-- =========================
CREATE TABLE contracts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_number VARCHAR(50) UNIQUE NOT NULL,
  lot_id          UUID NOT NULL REFERENCES coffee_lots(id) ON DELETE RESTRICT,
  farmer_id       UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  buyer_id        UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,

  contract_date   DATE DEFAULT CURRENT_DATE,

  quantity_bags   INTEGER NOT NULL CHECK (quantity_bags > 0),
  bag_size_kg     INTEGER NOT NULL CHECK (bag_size_kg > 0),

  price_per_kg    NUMERIC(12,2) NOT NULL CHECK (price_per_kg >= 0),
  currency        VARCHAR(10) NOT NULL DEFAULT 'USD',
  total_value     NUMERIC(14,2) NOT NULL CHECK (total_value >= 0),

  status          VARCHAR(30) NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft','signed','in_progress','completed','cancelled')),
  notes           TEXT,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_contracts_lot_id ON contracts(lot_id);
CREATE INDEX idx_contracts_farmer_id ON contracts(farmer_id);
CREATE INDEX idx_contracts_buyer_id ON contracts(buyer_id);

-- =========================
-- LOGISTICS: SHIPMENTS
-- =========================
CREATE TABLE shipments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id      UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,

  reference        VARCHAR(100),
  origin_port      VARCHAR(150),
  destination_port VARCHAR(150),
  container_number VARCHAR(80),
  vessel_name      VARCHAR(150),
  carrier          VARCHAR(150),

  etd              DATE,
  eta              DATE,

  status           VARCHAR(30) NOT NULL DEFAULT 'planned'
                   CHECK (status IN ('planned','booked','departed','arrived','delivered','delayed','cancelled')),
  tracking_url     TEXT,
  notes            TEXT,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_shipments_contract_id ON shipments(contract_id);

-- =========================
-- ROASTER: INVENTORY
-- =========================
CREATE TABLE roaster_inventory (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roaster_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contract_id  UUID REFERENCES contracts(id) ON DELETE SET NULL,
  lot_id       UUID REFERENCES coffee_lots(id) ON DELETE SET NULL,

  current_bags INTEGER NOT NULL DEFAULT 0 CHECK (current_bags >= 0),
  bag_size_kg  INTEGER DEFAULT 60 CHECK (bag_size_kg > 0),

  location     VARCHAR(255),
  notes        TEXT,

  created_at   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_roaster_inventory_roaster_id ON roaster_inventory(roaster_id);
CREATE INDEX idx_roaster_inventory_lot_id ON roaster_inventory(lot_id);

-- =========================
-- NOTIFICATIONS
-- =========================
CREATE TABLE notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      VARCHAR(255) NOT NULL,
  body       TEXT,
  type       VARCHAR(50),
  is_read    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read);
