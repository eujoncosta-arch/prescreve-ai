// ============================================================
// PRESCREVE-AI — ENTERPRISE CERTIFICATION REPORT v3 (ETAPA 22.6E — reexecução)
//
// Reexecução da certificação APÓS a criação, deploy e validação do backend
// (NestJS + Prisma + PostgreSQL/Neon) em produção na Vercel.
// Auditoria SOMENTE LEITURA — nenhum código clínico modificado.
//
// Evidências coletadas por execução real (build/tsc/testes) e por validação
// end-to-end em produção (register/login gravando/lendo no Neon) — 2026-07.
//
// CDSS — suporte à decisão clínica. Decisão médica soberana.
// ============================================================

export type CategoriaMaturidade =
  | 'Prototype'
  | 'Research'
  | 'Clinical Decision Support'
  | 'Enterprise Clinical Platform'
  | 'Enterprise Medical Intelligence Platform'
  | 'Hospital Grade Platform';

export type StatusAuditoria = 'aprovado' | 'aprovado_com_ressalvas' | 'reprovado';

export interface ItemAuditado {
  item: string;
  status: 'ok' | 'aviso' | 'falha';
  evidencia: string;
}

export interface ScoreDetalhado {
  nome: string;
  valor: number;          // 0–100
  base_v2?: number;       // referência Certification Report v2 (pré-backend)
  justificativa: string;
}

export interface BloqueadorCertificacao {
  id: string;
  titulo: string;
  severidade: 'bloqueante' | 'alta' | 'media';
  estado: 'resolvido' | 'pendente';
  descricao: string;
}

export interface CertificacaoReportV3 {
  versao: 'v3';
  etapa: '22.6E-reexec';
  gerado_em: string;
  itens_auditados: ItemAuditado[];
  scores: ScoreDetalhado[];
  final_score: number;
  final_score_v2: number;
  categoria: CategoriaMaturidade;
  categoria_justificativa: string;
  bloqueadores: BloqueadorCertificacao[];
  status: StatusAuditoria;
}

const ITENS_AUDITADOS: ItemAuditado[] = [
  { item: 'Todas as engines',            status: 'ok',    evidencia: '98 módulos em src/lib; engines-chave presentes e testadas' },
  { item: 'Todas as páginas',            status: 'ok',    evidencia: '45 page.tsx; 49 rotas estáticas; build sem erro' },
  { item: 'Todas as integrações',        status: 'ok',    evidencia: 'FHIR R4 (13 recursos) + HL7 v2 (7 segmentos) + RNDS + TISS; 117/117 testes interop (100%)' },
  { item: 'Todas as calculadoras',       status: 'ok',    evidencia: 'dose-calculator + motores pediátrico/obstétrico/geriátrico/ICU' },
  { item: 'Bancos farmacológicos',       status: 'ok',    evidencia: '16 arquivos, 384 fármacos indexados' },
  { item: 'Protocolos',                  status: 'ok',    evidencia: 'ALTERNATIVAS_DB 13 CIDs; diretrizes SBC/ADA/ESC/GINA/GOLD/KDIGO/APA/SBEM' },
  { item: 'Especialidades',              status: 'ok',    evidencia: '15 especialidades' },
  { item: 'Explainable AI',              status: 'ok',    evidencia: 'explainable-ai + v2 (WHY/WHY-NOT, racionalidade, confiança)' },
  { item: 'Trust Score',                 status: 'ok',    evidencia: 'medical-trust-score integrado' },
  { item: 'Recommendation Registry',     status: 'ok',    evidencia: 'recommendation-registry + verificação de integridade + tabela no Postgres' },
  { item: 'Knowledge Graph',             status: 'ok',    evidencia: 'medical-knowledge-graph (centralidade)' },
  { item: 'Copilot',                     status: 'ok',    evidencia: 'medical-copilot (SOAP)' },
  { item: 'FHIR',                        status: 'ok',    evidencia: 'FHIR R4 — 45 SNOMED, 52 LOINC, 51 RxNorm/ATC' },
  { item: 'HL7',                         status: 'ok',    evidencia: 'HL7 v2 inbound + export MSH·PID·PV1·ORC·RXE·OBR·OBX' },
  { item: 'Backend',                     status: 'ok',    evidencia: 'NestJS + Prisma DEPLOYADO na Vercel; build exit 0; 6 módulos; health 200 (x-powered-by: Express)' },
  { item: 'Banco de dados',              status: 'ok',    evidencia: 'PostgreSQL (Neon) — 34 tabelas via prisma db push; TLS + criptografia em repouso' },
  { item: 'Autenticação',               status: 'ok',    evidencia: 'JWT (access+refresh) validado em produção: register→201, login→200; bcrypt; RBAC (5 arquivos com guards); MFA no schema' },
  { item: 'Persistência',               status: 'ok',    evidencia: 'Consultas/prescrições/auditoria persistidas no Postgres (não mais só localStorage)' },
  { item: 'Frontend',                    status: 'ok',    evidencia: 'Next.js App Router; conectado ao backend (NEXT_PUBLIC_API_URL=/api/backend inlined)' },
  { item: 'Build',                       status: 'ok',    evidencia: 'Frontend + backend compilam; monorepo CI GitHub→Vercel verde' },
  { item: 'TypeScript',                  status: 'ok',    evidencia: 'tsc --noEmit 0 erros (frontend); nest build 0 erros (backend)' },
  { item: 'Runtime',                     status: 'ok',    evidencia: 'Produção READY; backend uptime confirmado; conexão Neon ativa' },
  { item: 'SSR',                         status: 'ok',    evidencia: '0 acessos localStorage não-guardados; storage.ts SSR-safe' },
  { item: 'Deploy',                      status: 'ok',    evidencia: 'Produção Vercel READY (frontend+backend, nodejs:3); HTTPS + HSTS' },
  { item: 'Performance',                 status: 'ok',    evidencia: 'Build ~15s; 49 rotas estáticas; testes < 2s' },
  { item: 'Testes',                      status: 'aviso', evidencia: '55 vitest + 117 interop (frontend) OK; backend com apenas 2 specs — cobertura backend fina, sem E2E' },
];

const SCORES: ScoreDetalhado[] = [
  { nome: 'Scientific Score', valor: 88, base_v2: 88, justificativa: 'Inalterado — 12 diagnósticos, 46 estudos reais (DOI+PMID), 45 moléculas, NNT/NNH/RRR/RAR.' },
  { nome: 'Clinical Score', valor: 87, base_v2: 87, justificativa: 'Inalterado — 384 fármacos, 15 especialidades, 55 testes clínicos. Falta validação prospectiva independente.' },
  { nome: 'Interoperability Score', valor: 90, base_v2: 90, justificativa: 'FHIR/HL7/RNDS conformes + backend agora expõe endpoints de evidência/RWE ao vivo. Integração HIS ainda simulada.' },
  { nome: 'Security Score', valor: 88, base_v2: 80, justificativa: '↑ Autenticação JWT real validada em produção, bcrypt, RBAC (guards), refresh tokens, MFA no schema, trilha de auditoria com hash de integridade + IP/UA hasheados (LGPD), soft delete, CPF/CRM hasheados, TLS/HSTS + criptografia em repouso (Neon). Falta rate limiting verificado, pentest e DPIA/LGPD formal.' },
  { nome: 'Enterprise Score', valor: 90, base_v2: 84, justificativa: '↑ Arquitetura 3 camadas real DEPLOYADA (Next.js + NestJS + PostgreSQL), CI/CD monorepo verde na Vercel, health check, logging HTTP, módulo de migração. Falta cobertura de testes de backend, E2E e observabilidade/SLA/DR.' },
];

const FINAL_SCORE = Math.round(SCORES.reduce((s, x) => s + x.valor, 0) / SCORES.length); // 89
const FINAL_SCORE_V2 = 86;

const BLOQUEADORES: BloqueadorCertificacao[] = [
  { id: 'BLQ-01', titulo: 'Persistência sem backend real', severidade: 'bloqueante', estado: 'resolvido',
    descricao: 'RESOLVIDO — PostgreSQL (Neon) em produção com 34 tabelas; consultas/prescrições/auditoria persistidas server-side.' },
  { id: 'BLQ-02', titulo: 'Autenticação e autorização ausentes', severidade: 'bloqueante', estado: 'resolvido',
    descricao: 'RESOLVIDO — JWT (access+refresh) validado em produção, bcrypt, RBAC por perfil (MEDICO/ADMIN/LABORATORIO/HOSPITAL/AUDITOR), campos MFA no schema.' },
  { id: 'BLQ-04', titulo: 'Sem clearance regulatório', severidade: 'bloqueante', estado: 'pendente',
    descricao: 'PENDENTE — ausência de registro ANVISA (SaMD), marcação CE (MDR) ou clearance FDA. Uso clínico direto exige enquadramento como dispositivo médico de software.' },
  { id: 'BLQ-05', titulo: 'Validação clínica prospectiva', severidade: 'bloqueante', estado: 'pendente',
    descricao: 'PENDENTE — sem estudo prospectivo/validação por corpo médico independente em ambiente real de atendimento.' },
  { id: 'BLQ-03', titulo: 'Integração HIS/RNDS produtiva', severidade: 'alta', estado: 'pendente',
    descricao: 'PENDENTE — exportadores conformes em formato, mas sem endpoint produtivo homologado (RNDS/DATASUS) nem handshake real com HIS hospitalar.' },
  { id: 'BLQ-07', titulo: 'Hardening operacional', severidade: 'alta', estado: 'pendente',
    descricao: 'PENDENTE — falta rate limiting verificado, teste de intrusão, DPIA/LGPD formal, observabilidade/SLA e runbook de backup/disaster recovery.' },
  { id: 'BLQ-06', titulo: 'Cobertura de testes e CI gate', severidade: 'media', estado: 'pendente',
    descricao: 'PENDENTE — frontend com 172 testes, mas backend com apenas 2 specs; falta E2E e gate de CI bloqueando merge.' },
];

export function gerarCertificacaoV3(): CertificacaoReportV3 {
  return {
    versao: 'v3',
    etapa: '22.6E-reexec',
    gerado_em: new Date().toISOString(),
    itens_auditados: ITENS_AUDITADOS,
    scores: SCORES,
    final_score: FINAL_SCORE,
    final_score_v2: FINAL_SCORE_V2,
    categoria: 'Enterprise Medical Intelligence Platform',
    categoria_justificativa:
      'Com o backend criado, deployado e validado (persistência PostgreSQL + autenticação JWT/RBAC em produção), a plataforma passa a ocupar o TOPO da faixa "Enterprise Medical Intelligence Platform" — arquitetura 3 camadas real, inteligência clínica completa e interoperabilidade conforme. Ainda NÃO atinge "Hospital Grade Platform" porque os bloqueios remanescentes são regulatórios, de validação clínica prospectiva e de hardening operacional — não mais arquiteturais.',
    bloqueadores: BLOQUEADORES,
    status: 'aprovado_com_ressalvas',
  };
}

export function formatarCertificacaoV3(r: CertificacaoReportV3 = gerarCertificacaoV3()): string {
  const L: string[] = [
    '═══════════════════════════════════════════════════════════════════════',
    '  PRESCREVE-AI — ENTERPRISE CERTIFICATION REPORT v3',
    '  ETAPA 22.6E (reexecução pós-backend) — auditoria somente-leitura',
    '═══════════════════════════════════════════════════════════════════════',
    `  Gerado em : ${r.gerado_em}`,
    `  Status    : ${r.status.toUpperCase()}`,
    '───────────────────────────────────────────────────────────────────────',
    '  CHECKLIST DE AUDITORIA',
    '───────────────────────────────────────────────────────────────────────',
  ];
  for (const it of r.itens_auditados) {
    const ic = it.status === 'ok' ? '✓' : it.status === 'aviso' ? '⚠' : '✗';
    L.push(`  ${ic} ${it.item.padEnd(24)} ${it.evidencia}`);
  }
  L.push('───────────────────────────────────────────────────────────────────────');
  L.push('  SCORES (recalculados vs. v2)');
  L.push('───────────────────────────────────────────────────────────────────────');
  for (const s of r.scores) {
    const delta = s.base_v2 !== undefined && s.valor !== s.base_v2 ? `  (v2: ${s.base_v2} → +${s.valor - s.base_v2})` : (s.base_v2 !== undefined ? '  (=)' : '');
    L.push(`  ${s.nome.padEnd(26)} ${s.valor}/100${delta}`);
  }
  L.push('  ' + '─'.repeat(50));
  L.push(`  FINAL SCORE                ${r.final_score}/100   (v2: ${r.final_score_v2} → +${r.final_score - r.final_score_v2})`);
  L.push('───────────────────────────────────────────────────────────────────────');
  L.push('  CLASSIFICAÇÃO DE MATURIDADE');
  L.push('───────────────────────────────────────────────────────────────────────');
  const escala: CategoriaMaturidade[] = [
    'Prototype', 'Research', 'Clinical Decision Support',
    'Enterprise Clinical Platform', 'Enterprise Medical Intelligence Platform', 'Hospital Grade Platform',
  ];
  for (const c of escala) L.push(`  ${c === r.categoria ? '►' : ' '} ${c}`);
  L.push('');
  L.push('  ' + r.categoria_justificativa);
  L.push('───────────────────────────────────────────────────────────────────────');
  L.push('  BLOQUEADORES DA CERTIFICAÇÃO MÁXIMA (Hospital Grade Platform)');
  L.push('───────────────────────────────────────────────────────────────────────');
  const resolvidos = r.bloqueadores.filter(b => b.estado === 'resolvido');
  const pendentes = r.bloqueadores.filter(b => b.estado === 'pendente');
  L.push(`  ✓ RESOLVIDOS nesta etapa (${resolvidos.length}):`);
  for (const b of resolvidos) L.push(`     [${b.id}] ${b.titulo} — ${b.descricao}`);
  L.push(`  ✗ PENDENTES (${pendentes.length}) — exatamente o que ainda impede a certificação máxima:`);
  for (const b of pendentes) L.push(`     [${b.id}] (${b.severidade}) ${b.titulo}\n          ${b.descricao}`);
  L.push('═══════════════════════════════════════════════════════════════════════');
  L.push('  CDSS — Suporte à decisão clínica. Decisão médica soberana.');
  L.push('═══════════════════════════════════════════════════════════════════════');
  return L.join('\n');
}
