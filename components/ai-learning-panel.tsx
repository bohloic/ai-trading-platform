'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getPatterns, getRecentDecisions } from '@/app/actions/trading'
import { Brain, AlertTriangle, CheckCircle, XCircle, Lightbulb, TrendingUp, TrendingDown } from 'lucide-react'

interface AILearningPanelProps {
  errors: any[]
}

const errorTypeLabels: Record<string, string> = {
  false_positive: 'Faux Positif',
  false_negative: 'Faux Negatif',
  bad_timing: 'Mauvais Timing',
  wrong_direction: 'Mauvaise Direction',
  poor_risk_management: 'Mauvaise Gestion du Risque',
  missed_opportunity: 'Opportunite Manquee',
}

const severityColors: Record<number, string> = {
  1: 'bg-green-500',
  2: 'bg-green-500',
  3: 'bg-yellow-500',
  4: 'bg-yellow-500',
  5: 'bg-orange-500',
  6: 'bg-orange-500',
  7: 'bg-red-500',
  8: 'bg-red-500',
  9: 'bg-red-600',
  10: 'bg-red-700',
}

export function AILearningPanel({ errors }: AILearningPanelProps) {
  const [patterns, setPatterns] = useState<any[]>([])
  const [decisions, setDecisions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [patternsData, decisionsData] = await Promise.all([
          getPatterns(),
          getRecentDecisions(),
        ])
        setPatterns(patternsData)
        setDecisions(decisionsData)
      } catch (error) {
        console.error('Failed to load AI data:', error)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Erreurs d'apprentissage */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            Erreurs et Apprentissage
          </CardTitle>
          <CardDescription>
            L&apos;IA analyse ses erreurs pour ne plus les repeter
          </CardDescription>
        </CardHeader>
        <CardContent>
          {errors.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <p className="text-muted-foreground">
                Aucune erreur enregistree. L&apos;IA apprendra au fur et a mesure.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {errors.map((error) => (
                <div
                  key={error.id}
                  className="p-4 rounded-lg border border-border bg-card"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {errorTypeLabels[error.errorType] || error.errorType}
                      </Badge>
                      {error.timesRepeated > 1 && (
                        <Badge variant="destructive">
                          Repete {error.timesRepeated}x
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground">Severite:</span>
                      <div className={`w-2 h-2 rounded-full ${severityColors[error.errorSeverity] || 'bg-gray-500'}`} />
                      <span className="text-xs font-medium">{error.errorSeverity}/10</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Ce qui s&apos;est passe:</p>
                      <p className="text-sm text-foreground">{error.whatWentWrong}</p>
                    </div>
                    <div className="flex items-start gap-2 p-3 rounded bg-primary/5 border border-primary/10">
                      <Lightbulb className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Lecon apprise:</p>
                        <p className="text-sm text-foreground">{error.lessonLearned}</p>
                      </div>
                    </div>
                    {error.correctionApplied && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Correction appliquee:</p>
                        <p className="text-sm text-green-500">{error.correctionApplied}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Patterns appris */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            Patterns Appris
          </CardTitle>
          <CardDescription>
            Patterns identifies par l&apos;IA
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground py-4">Chargement...</p>
          ) : patterns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <Brain className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                L&apos;IA n&apos;a pas encore identifie de patterns.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {patterns.map((pattern) => (
                <div
                  key={pattern.id}
                  className="p-3 rounded-lg border border-border"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">{pattern.patternName}</span>
                    <Badge variant={pattern.patternType === 'bullish' ? 'default' : pattern.patternType === 'bearish' ? 'destructive' : 'secondary'}>
                      {pattern.patternType === 'bullish' ? (
                        <TrendingUp className="w-3 h-3 mr-1" />
                      ) : pattern.patternType === 'bearish' ? (
                        <TrendingDown className="w-3 h-3 mr-1" />
                      ) : null}
                      {pattern.patternType}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{pattern.description}</p>
                  <div className="flex items-center gap-4 text-xs">
                    <span className={parseFloat(pattern.successRate) >= 0.5 ? 'text-green-500' : 'text-red-500'}>
                      {(parseFloat(pattern.successRate) * 100).toFixed(0)}% succes
                    </span>
                    <span className="text-muted-foreground">
                      {pattern.totalOccurrences} occurrences
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dernieres decisions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            Decisions Recentes
          </CardTitle>
          <CardDescription>
            Historique des decisions de l&apos;IA
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground py-4">Chargement...</p>
          ) : decisions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <CheckCircle className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                Aucune decision enregistree.
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {decisions.map((decision) => (
                <div
                  key={decision.id}
                  className="p-3 rounded-lg border border-border"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{decision.symbol}</span>
                      <Badge variant="outline" className="text-xs">
                        {decision.decisionType}
                      </Badge>
                    </div>
                    {decision.wasCorrect !== null && (
                      decision.wasCorrect ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{decision.reasoning}</p>
                  <div className="flex items-center gap-2 mt-2 text-xs">
                    <span className="text-muted-foreground">
                      Confiance: {(parseFloat(decision.confidence) * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
