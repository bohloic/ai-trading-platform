import { pgTable, text, timestamp, boolean, serial, integer, decimal, jsonb } from 'drizzle-orm/pg-core'

// --- Better Auth required tables -------------------------------------------

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('emailVerified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expiresAt').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
})

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: timestamp('accessTokenExpiresAt'),
  refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expiresAt').notNull(),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow(),
})

// --- Trading App Tables ----------------------------------------------------

export const brokerConnections = pgTable('broker_connections', {
  id: serial('id').primaryKey(),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  broker: text('broker').notNull(), // 'bybit', 'exness', 'deriv', 'simulation'
  apiKey: text('apiKey'),
  apiSecret: text('apiSecret'),
  isActive: boolean('isActive').default(true),
  isDemo: boolean('isDemo').default(true),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const trades = pgTable('trades', {
  id: serial('id').primaryKey(),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  brokerId: integer('brokerId').references(() => brokerConnections.id, { onDelete: 'set null' }),
  symbol: text('symbol').notNull(),
  side: text('side').notNull(), // 'buy', 'sell'
  entryPrice: decimal('entryPrice', { precision: 20, scale: 8 }).notNull(),
  exitPrice: decimal('exitPrice', { precision: 20, scale: 8 }),
  quantity: decimal('quantity', { precision: 20, scale: 8 }).notNull(),
  leverage: integer('leverage').default(1),
  stopLoss: decimal('stopLoss', { precision: 20, scale: 8 }),
  takeProfit: decimal('takeProfit', { precision: 20, scale: 8 }),
  status: text('status').notNull().default('open'), // 'open', 'closed', 'cancelled'
  pnl: decimal('pnl', { precision: 20, scale: 8 }),
  pnlPercent: decimal('pnlPercent', { precision: 10, scale: 4 }),
  aiConfidence: decimal('aiConfidence', { precision: 5, scale: 4 }),
  aiReasoning: text('aiReasoning'),
  openedAt: timestamp('openedAt').notNull().defaultNow(),
  closedAt: timestamp('closedAt'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
})

export const aiDecisions = pgTable('ai_decisions', {
  id: serial('id').primaryKey(),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  tradeId: integer('tradeId').references(() => trades.id, { onDelete: 'set null' }),
  decisionType: text('decisionType').notNull(), // 'entry', 'exit', 'hold', 'skip'
  symbol: text('symbol').notNull(),
  marketCondition: jsonb('marketCondition'),
  indicators: jsonb('indicators'),
  reasoning: text('reasoning').notNull(),
  confidence: decimal('confidence', { precision: 5, scale: 4 }).notNull(),
  predictedOutcome: text('predictedOutcome'),
  actualOutcome: text('actualOutcome'),
  wasCorrect: boolean('wasCorrect'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
})

export const aiLearningErrors = pgTable('ai_learning_errors', {
  id: serial('id').primaryKey(),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  decisionId: integer('decisionId').references(() => aiDecisions.id, { onDelete: 'cascade' }),
  tradeId: integer('tradeId').references(() => trades.id, { onDelete: 'set null' }),
  errorType: text('errorType').notNull(), // 'false_positive', 'false_negative', 'bad_timing', 'wrong_direction', 'poor_risk_management', 'missed_opportunity'
  errorSeverity: integer('errorSeverity'), // 1-10
  marketContext: jsonb('marketContext').notNull(),
  whatWentWrong: text('whatWentWrong').notNull(),
  lessonLearned: text('lessonLearned').notNull(),
  correctionApplied: text('correctionApplied'),
  similarPatterns: jsonb('similarPatterns'),
  timesRepeated: integer('timesRepeated').default(1),
  lastOccurrence: timestamp('lastOccurrence').defaultNow(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
})

export const aiPatterns = pgTable('ai_patterns', {
  id: serial('id').primaryKey(),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  patternName: text('patternName').notNull(),
  patternType: text('patternType').notNull(), // 'bullish', 'bearish', 'neutral', 'reversal', 'continuation'
  description: text('description').notNull(),
  indicators: jsonb('indicators').notNull(),
  conditions: jsonb('conditions').notNull(),
  successRate: decimal('successRate', { precision: 5, scale: 4 }).default('0'),
  totalOccurrences: integer('totalOccurrences').default(0),
  profitableOccurrences: integer('profitableOccurrences').default(0),
  avgProfitPercent: decimal('avgProfitPercent', { precision: 10, scale: 4 }),
  avgLossPercent: decimal('avgLossPercent', { precision: 10, scale: 4 }),
  isActive: boolean('isActive').default(true),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const tradingSettings = pgTable('trading_settings', {
  id: serial('id').primaryKey(),
  userId: text('userId')
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: 'cascade' }),
  riskPerTrade: decimal('riskPerTrade', { precision: 5, scale: 4 }).default('0.02'),
  maxDailyLoss: decimal('maxDailyLoss', { precision: 5, scale: 4 }).default('0.05'),
  maxOpenTrades: integer('maxOpenTrades').default(3),
  defaultLeverage: integer('defaultLeverage').default(1),
  tradingPairs: jsonb('tradingPairs').default(['BTC/USDT', 'ETH/USDT']),
  tradingHours: jsonb('tradingHours'),
  aiAggressiveness: text('aiAggressiveness').default('moderate'), // 'conservative', 'moderate', 'aggressive'
  autoTrade: boolean('autoTrade').default(false),
  notificationsEnabled: boolean('notificationsEnabled').default(true),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

// Type exports
export type User = typeof user.$inferSelect
export type Trade = typeof trades.$inferSelect
export type AiDecision = typeof aiDecisions.$inferSelect
export type AiLearningError = typeof aiLearningErrors.$inferSelect
export type AiPattern = typeof aiPatterns.$inferSelect
export type BrokerConnection = typeof brokerConnections.$inferSelect
export type TradingSettings = typeof tradingSettings.$inferSelect
