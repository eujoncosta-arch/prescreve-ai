// ============================================================
// PRESCREVE-AI — API Route: Sync Eurofarma
// Endpoint para trigger e verificação de sincronização
// Chamado por cron job (diário, 03:00 BRT)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { SYNC_STATUS, AUDIT_TRAIL, EUROFARMA_CATALOG } from '@/lib/eurofarma-sync';

export const dynamic = 'force-static';

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
  const authHeader = request.headers.get('authorization');

  // Validação básica de autorização (em produção: JWT do médico admin)
  if (!authHeader && process.env.NODE_ENV === 'production') {
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
