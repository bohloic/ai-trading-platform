-- Initial schema migration (Better Auth + Trading App tables)

CREATE TABLE IF NOT EXISTS "user" (
  "id" text PRIMARY KEY,
  "name" text NOT NULL,
  "email" text NOT NULL UNIQUE,
  "emailVerified" boolean NOT NULL DEFAULT false,
  "image" text,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "session" (
  "id" text PRIMARY KEY,
  "expiresAt" timestamp NOT NULL,
  "token" text NOT NULL UNIQUE,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now(),
  "ipAddress" text,
  "userAgent" text,
  "userId" text NOT NULL REFERENCES "user"("id") ON DELETE cascade
);

CREATE TABLE IF NOT EXISTS "account" (
  "id" text PRIMARY KEY,
  "accountId" text NOT NULL,
  "providerId" text NOT NULL,
  "userId" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
  "accessToken" text,
  "refreshToken" text,
  "idToken" text,
  "accessTokenExpiresAt" timestamp,
  "refreshTokenExpiresAt" timestamp,
  "scope" text,
  "password" text,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "verification" (
  "id" text PRIMARY KEY,
  "identifier" text NOT NULL,
  "value" text NOT NULL,
  "expiresAt" timestamp NOT NULL,
  "createdAt" timestamp DEFAULT now(),
  "updatedAt" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "broker_connections" (
  "id" serial PRIMARY KEY,
  "userId" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
  "broker" text NOT NULL,
  "apiKey" text,
  "apiSecret" text,
  "isActive" boolean DEFAULT true,
  "isDemo" boolean DEFAULT true,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "trades" (
  "id" serial PRIMARY KEY,
  "userId" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
  "brokerId" integer REFERENCES "broker_connections"("id") ON DELETE set null,
  "symbol" text NOT NULL,
  "side" text NOT NULL,
  "entryPrice" numeric(20, 8) NOT NULL,
  "exitPrice" numeric(20, 8),
  "quantity" numeric(20, 8) NOT NULL,
  "leverage" integer DEFAULT 1,
  "stopLoss" numeric(20, 8),
  "takeProfit" numeric(20, 8),
  "status" text NOT NULL DEFAULT 'open',
  "pnl" numeric(20, 8),
  "pnlPercent" numeric(10, 4),
  "aiConfidence" numeric(5, 4),
  "aiReasoning" text,
  "openedAt" timestamp NOT NULL DEFAULT now(),
  "closedAt" timestamp,
  "createdAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "ai_decisions" (
  "id" serial PRIMARY KEY,
  "userId" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
  "tradeId" integer REFERENCES "trades"("id") ON DELETE set null,
  "decisionType" text NOT NULL,
  "symbol" text NOT NULL,
  "marketCondition" jsonb,
  "indicators" jsonb,
  "reasoning" text NOT NULL,
  "confidence" numeric(5, 4) NOT NULL,
  "predictedOutcome" text,
  "actualOutcome" text,
  "wasCorrect" boolean,
  "createdAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "ai_learning_errors" (
  "id" serial PRIMARY KEY,
  "userId" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
  "decisionId" integer REFERENCES "ai_decisions"("id") ON DELETE cascade,
  "tradeId" integer REFERENCES "trades"("id") ON DELETE set null,
  "errorType" text NOT NULL,
  "errorSeverity" integer,
  "marketContext" jsonb NOT NULL,
  "whatWentWrong" text NOT NULL,
  "lessonLearned" text NOT NULL,
  "correctionApplied" text,
  "similarPatterns" jsonb,
  "timesRepeated" integer DEFAULT 1,
  "lastOccurrence" timestamp DEFAULT now(),
  "createdAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "ai_patterns" (
  "id" serial PRIMARY KEY,
  "userId" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
  "patternName" text NOT NULL,
  "patternType" text NOT NULL,
  "description" text NOT NULL,
  "indicators" jsonb NOT NULL,
  "conditions" jsonb NOT NULL,
  "successRate" numeric(5, 4) DEFAULT '0',
  "totalOccurrences" integer DEFAULT 0,
  "profitableOccurrences" integer DEFAULT 0,
  "avgProfitPercent" numeric(10, 4),
  "avgLossPercent" numeric(10, 4),
  "isActive" boolean DEFAULT true,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "trading_settings" (
  "id" serial PRIMARY KEY,
  "userId" text NOT NULL UNIQUE REFERENCES "user"("id") ON DELETE cascade,
  "riskPerTrade" numeric(5, 4) DEFAULT '0.02',
  "maxDailyLoss" numeric(5, 4) DEFAULT '0.05',
  "maxOpenTrades" integer DEFAULT 3,
  "defaultLeverage" integer DEFAULT 1,
  "tradingPairs" jsonb DEFAULT '["BTC/USDT","ETH/USDT"]'::jsonb,
  "tradingHours" jsonb,
  "aiAggressiveness" text DEFAULT 'moderate',
  "autoTrade" boolean DEFAULT false,
  "notificationsEnabled" boolean DEFAULT true,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

