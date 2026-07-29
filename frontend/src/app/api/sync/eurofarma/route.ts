// ============================================================
// PRESCREVE-AI — API Route: Sync Eurofarma
// Endpoint para trigger e verificação de sincronização
// Chamado por cron job (diário, 03:00 BRT)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { SYNC_STATUS, AUDIT_TRAIL, EUROFARMA_CATALOG } from '@/lib/eurofarma-sync';

export const dynamic = 'force-static';

// RM-56-02: a checagem anterior só verificava se o header `Authorization`
// existia (qualquer valor não-vazio passava) e só em produção — fora de
// produção o endpoint ficava totalmente aberto. Comparação real, em
// tempo constante, contra um segredo dedicado (`EUROFARMA_SYNC_TOKEN`,
// nunca prefixado com `NEXT_PUBLIC_`, portanto nunca embutido no bundle
// do cliente). Mesmo padrão fail-safe do resto do app: sem segredo
// configurado, o gatilho fica BLOQUEADO em produção (nunca "aberto por
// omissão"); fora de produção, sem segredo configurado, permanece aberto
// para permitir uso local sem configuração adicional.
function autorizado(request: NextRequest): boolean {
  const token = process.env.EUROFARMA_SYNC_TOKEN;
  if (!token) return process.env.NODE_ENV !== 'production';

  const authHeader = request.headers.get('authorization') ?? '';
  const fornecido = Buffer.from(authHeader.replace(/^Bearer\s+/i, ''), 'utf8');
  const esperado = Buffer.from(token, 'utf8');
  if (fornecido.length !== esperado.length) return false;
  return crypto.timingSafeEqual(fornecido, esperado);
}

// GET /api/sync/eurofarma — retorna status atual do sync
export async function GET() {
  return NextResponse.json({
    status: SYNC_STATUS,
    total_produtos: EUROFARMA_CATALOG.length,
    audit_recente: AUDIT_TRAIL.slice(0, 5),
    timestamp: new Date().toISOString(),
  });
}

// POST /api/sync/eurofarma — dispara sincronização manual
// Em produção: scrape do portal Eurofarma + diff + persist no DB
export async function POST(request: NextRequest) {
  if (!autorizado(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // TODO: Em produção, esta função faria:
  // 1. Fetch de https://eurofarma.com.br/produtos (scrape controlado)
  // 2. Parse de cada produto (playwright ou cheerio)
  // 3. Diff com versão atual (hash de conteúdo)
  // 4. Atualização no banco de dados (Supabase/PlanetScale)
  // 5. Notificação de mudanças relevantes

  // Por agora retorna o status atual como simulação de sync bem-sucedido
  const resultado = {
    sync_iniciado: new Date().toISOString(),
    sync_concluido: new Date().toISOString(),
    produtos_verificados: EUROFARMA_CATALOG.length,
    produtos_novos: 0,
    produtos_atualizados: 0,
    erros: [],
    proxima_sync_agendada: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    nota: 'Sync simulado — integração real requer backend com acesso ao portal Eurofarma',
  };

  return NextResponse.json(resultado, { status: 200 });
}
