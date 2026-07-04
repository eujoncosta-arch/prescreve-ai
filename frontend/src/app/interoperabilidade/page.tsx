'use client';

import React, { useState, useMemo } from 'react';
import {
  Share2, Download, Upload, CheckCircle2, AlertTriangle,
  Globe, Database, Zap, FileCode2, RefreshCw, Building2,
  ChevronDown, ChevronRight, Copy, FlaskConical,
} from 'lucide-react';
import {
  exportarFHIR, importarFHIR, simularIntegracao, converterHL7,
  validarFHIR, mapearCID, mapearLOINC, gerarGuiaTISS,
  CID_SNOMED_MAP, EXAME_LOINC_MAP,
  type DadosClinicos, type SimulacaoIntegracao,
} from '@/lib/interoperability-engine';

type Aba = 'fhir' | 'tiss' | 'mapeamento' | 'simulador' | 'hl7';

const ABAS = [
  { id: 'fhir' as Aba,      label: 'FHIR R4',        icon: <FileCode2 size={13} /> },
  { id: 'tiss' as Aba,      label: 'TISS Brasil',    icon: <Database size={13} /> },
  { id: 'mapeamento' as Aba,label: 'Terminologia',   icon: <Globe size={13} /> },
  { id: 'simulador' as Aba, label: 'Simulador',      icon: <Zap size={13} /> },
  { id: 'hl7' as Aba,       label: 'HL7 Conversor',  icon: <RefreshCw size={13} /> },
];

const DEMO_PACIENTE: DadosClinicos = {
  paciente_id: 'pac-001',
  nome: 'João da Silva',
  nascimento: '1965-04-15',
  sexo: 'M',
  cns: '898765432109876',
  cids: ['I10', 'E11', 'E78'],
  medicamentos: ['enalapril', 'metformina', 'empagliflozina', 'rosuvastatina'],
  alergias: ['penicilina'],
  exames: { glicemia_jejum: 145, hba1c: 8.2, creatinina: 1.1, ldl: 98, colesterol_total: 195 },
  pa_sistolica: 148,
  pa_diastolica: 94,
};

export default function InteroperabilidadePage() {
  const [aba, setAba] = useState<Aba>('fhir');
  const [fhirOutput, setFhirOutput] = useState('');
  const [importInput, setImportInput] = useState('');
  const [importResult, setImportResult] = useState<ReturnType<typeof importarFHIR> | null>(null);
  const [simulacoes, setSimulacoes] = useState<SimulacaoIntegracao[]>([]);
  const [copiado, setCopiado] = useState(false);

  const handleExportar = () => {
    const json = exportarFHIR(DEMO_PACIENTE);
    setFhirOutput(json);
  };

  const handleImportar = () => {
    if (!importInput.trim()) return;
    const resultado = importarFHIR(importInput);
    setImportResult(resultado);
  };

  const handleCopiar = () => {
    navigator.clipboard.writeText(fhirOutput);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const handleSimular = () => {
    const bundle = JSON.parse(fhirOutput || exportarFHIR(DEMO_PACIENTE));
    const novas: SimulacaoIntegracao[] = [
      simularIntegracao('PRESCREVE-AI', 'HIS Hospitalar', 'FHIR R4', bundle),
      simularIntegracao('PRESCREVE-AI', 'Operadora de Saúde', 'TISS 3.x'),
      simularIntegracao('PRESCREVE-AI', 'RNDS/DATASUS', 'RNDS', bundle),
      simularIntegracao('HIS Hospitalar', 'PRESCREVE-AI', 'HL7 v2.x'),
    ];
    setSimulacoes(novas);
  };

  const validacao = useMemo(() => {
    if (!fhirOutput) return null;
    try { return validarFHIR(JSON.parse(fhirOutput)); } catch { return null; }
  }, [fhirOutput]);

  const cidEntries = Object.entries(CID_SNOMED_MAP).slice(0, 15);
  const loincEntries = Object.entries(EXAME_LOINC_MAP).slice(0, 15);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Share2 size={18} className="text-blue-600" />
              <h1 className="text-lg font-bold text-gray-900">Interoperabilidade Hospitalar</h1>
              <span className="px-2 py-0.5 text-xs font-bold bg-blue-100 text-blue-700 rounded">Phase 17</span>
            </div>
            <p className="text-xs text-gray-500">FHIR R4 · HL7 v2.x · TISS Brasil · SNOMED CT · LOINC · RxNorm</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Building2 size={13} />
            <span>Suporte à decisão — não substitui o médico</span>
          </div>
        </div>
      </div>

      {/* Abas */}
      <div className="bg-white border-b border-gray-200 px-6">
        <div className="max-w-5xl mx-auto flex gap-1">
          {ABAS.map(a => (
            <button key={a.id} onClick={() => setAba(a.id)}
              className={`flex items-center gap-1.5 px-3 py-3 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${aba === a.id ? 'border-blue-500 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {a.icon}{a.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">

        {/* ABA FHIR */}
        {aba === 'fhir' && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              {/* Exportar */}
              <div className="bg-white border border-gray-200 rounded-2xl p-5">
                <p className="text-sm font-bold text-gray-700 mb-3">Exportar Bundle FHIR R4</p>
                <div className="bg-gray-50 rounded-lg p-3 mb-3 text-xs text-gray-600 space-y-1">
                  <p><strong>Paciente:</strong> {DEMO_PACIENTE.nome}</p>
                  <p><strong>CIDs:</strong> {DEMO_PACIENTE.cids.join(', ')}</p>
                  <p><strong>Medicamentos:</strong> {DEMO_PACIENTE.medicamentos.join(', ')}</p>
                  <p><strong>Exames:</strong> {Object.keys(DEMO_PACIENTE.exames ?? {}).length} valores</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleExportar}
                    className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-all">
                    <Download size={13} />Gerar Bundle FHIR
                  </button>
                  {fhirOutput && (
                    <button onClick={handleCopiar}
                      className="flex items-center gap-1 px-3 py-2 bg-gray-100 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-200">
                      <Copy size={12} />{copiado ? 'Copiado!' : 'Copiar'}
                    </button>
                  )}
                </div>

                {fhirOutput && (
                  <div className="mt-3">
                    <div className="flex items-center gap-2 mb-2">
                      {validacao?.valido
                        ? <><CheckCircle2 size={13} className="text-emerald-600" /><span className="text-xs font-bold text-emerald-600">FHIR válido — conformidade {validacao.score_conformidade}%</span></>
                        : <><AlertTriangle size={13} className="text-amber-600" /><span className="text-xs text-amber-600">{validacao?.erros.length ?? 0} erro(s)</span></>}
                    </div>
                    <pre className="bg-gray-900 text-green-400 text-xs p-3 rounded-lg overflow-auto max-h-64 font-mono">
                      {fhirOutput.slice(0, 1200)}...
                    </pre>
                  </div>
                )}
              </div>

              {/* Importar */}
              <div className="bg-white border border-gray-200 rounded-2xl p-5">
                <p className="text-sm font-bold text-gray-700 mb-3">Importar FHIR Bundle</p>
                <textarea value={importInput} onChange={e => setImportInput(e.target.value)}
                  placeholder={'Cole o JSON FHIR R4 aqui...\n\n{"resourceType":"Bundle",...}'}
                  className="w-full h-40 text-xs font-mono border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50"
                />
                <button onClick={handleImportar}
                  className="mt-2 w-full flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700">
                  <Upload size={13} />Importar e Processar
                </button>
                {importResult && (
                  <div className={`mt-3 p-3 rounded-lg text-xs ${importResult.sucesso ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
                    <p className={`font-bold mb-1 ${importResult.sucesso ? 'text-emerald-700' : 'text-red-700'}`}>
                      {importResult.sucesso ? '✓ Importação bem-sucedida' : '✗ Erros na importação'}
                    </p>
                    <p className="text-gray-600">{importResult.recursos_importados} recursos · Tipos: {importResult.tipos_encontrados.join(', ')}</p>
                    {importResult.paciente?.nome && <p className="text-gray-600">Paciente: {importResult.paciente.nome}</p>}
                    {importResult.erros.map((e, i) => <p key={i} className="text-red-600">✗ {e}</p>)}
                    {importResult.avisos.map((a, i) => <p key={i} className="text-amber-600">⚠ {a}</p>)}
                  </div>
                )}
              </div>
            </div>

            {/* Recursos FHIR suportados */}
            <div className="bg-white border border-gray-200 rounded-2xl p-4">
              <p className="text-xs font-bold text-gray-500 uppercase mb-3">Recursos FHIR R4 Suportados</p>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                {['Patient','Encounter','Observation','Condition','MedicationRequest','MedicationStatement',
                  'DiagnosticReport','Procedure','AllergyIntolerance','CarePlan','Medication','Bundle'].map(r => (
                  <div key={r} className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-center">
                    <p className="text-xs font-bold text-blue-700">{r}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ABA TISS */}
        {aba === 'tiss' && (
          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-2xl p-5">
              <p className="text-sm font-bold text-gray-700 mb-4">TISS 3.x — Geração de Guia Demo</p>
              {(() => {
                const guia = gerarGuiaTISS(
                  'consulta',
                  { numero_carteira: '1234567890', nome: 'João da Silva', data_nascimento: '1965-04-15' },
                  { codigo_operadora: '999999', cnpj: '12.345.678/0001-99', nome: 'Unimed SP', cnes: '1234567' },
                  [
                    { codigo_tuss: '10101012', descricao: 'Consulta médica em atenção primária', quantidade: 1, valor_unitario: 120, data_realizacao: new Date().toISOString().split('T')[0] },
                    { codigo_tuss: '40308409', descricao: 'Eletrocardiograma', quantidade: 1, valor_unitario: 35, data_realizacao: new Date().toISOString().split('T')[0] },
                  ],
                  'I10',
                );
                return (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gray-50 rounded-lg p-3 text-xs">
                        <p className="font-bold text-gray-700 mb-2">Beneficiário</p>
                        <p>Nome: {guia.beneficiario.nome}</p>
                        <p>Carteira: {guia.beneficiario.numero_carteira}</p>
                        <p>Nasc.: {guia.beneficiario.data_nascimento}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3 text-xs">
                        <p className="font-bold text-gray-700 mb-2">Prestador</p>
                        <p>Operadora: {guia.prestador.nome}</p>
                        <p>CNES: {guia.prestador.cnes}</p>
                        <p>CNPJ: {guia.prestador.cnpj}</p>
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs font-bold text-gray-700 mb-2">Procedimentos</p>
                      {guia.procedimentos.map((p, i) => (
                        <div key={i} className="flex items-center justify-between py-1 text-xs border-b border-gray-200 last:border-0">
                          <span className="text-gray-600">{p.descricao}</span>
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-gray-400">{p.codigo_tuss}</span>
                            <span className="font-bold text-emerald-700">R$ {p.valor_unitario?.toFixed(2)}</span>
                          </div>
                        </div>
                      ))}
                      <div className="flex justify-between mt-2 pt-2 border-t border-gray-300 text-xs font-bold">
                        <span>Total</span>
                        <span className="text-emerald-700">R$ {guia.total_valor?.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">CID Principal: <strong>{guia.cid_principal}</strong></span>
                      <span className="text-xs text-gray-500">·</span>
                      <span className="text-xs text-gray-500">Nº Guia: <strong className="font-mono">{guia.numero_guia}</strong></span>
                      <span className={`text-xs px-2 py-0.5 rounded font-bold ${guia.status === 'pendente' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{guia.status}</span>
                    </div>
                  </div>
                );
              })()}
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-4">
              <p className="text-xs font-bold text-gray-500 uppercase mb-3">Transações TISS Suportadas</p>
              <div className="grid grid-cols-5 gap-2">
                {['Consultas','Procedimentos','Exames','Internações','Prescrições'].map(t => (
                  <div key={t} className="bg-emerald-50 border border-emerald-100 rounded-lg p-2 text-center">
                    <p className="text-xs font-bold text-emerald-700">{t}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ABA MAPEAMENTO */}
        {aba === 'mapeamento' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* CID → SNOMED */}
              <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                <div className="px-4 py-3 bg-purple-50 border-b border-purple-100">
                  <p className="text-xs font-bold text-purple-700">CID-10 → SNOMED CT</p>
                  <p className="text-xs text-purple-500">{Object.keys(CID_SNOMED_MAP).length} mapeamentos</p>
                </div>
                <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
                  {cidEntries.map(([cid, s]) => (
                    <div key={cid} className="px-3 py-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-gray-700">{cid}</span>
                        <span className="font-mono text-purple-600">{s.snomed}</span>
                      </div>
                      <p className="text-gray-500 truncate">{s.display}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Exame → LOINC */}
              <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                <div className="px-4 py-3 bg-blue-50 border-b border-blue-100">
                  <p className="text-xs font-bold text-blue-700">Exames → LOINC</p>
                  <p className="text-xs text-blue-500">{Object.keys(EXAME_LOINC_MAP).length} mapeamentos</p>
                </div>
                <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
                  {loincEntries.map(([exame, l]) => (
                    <div key={exame} className="px-3 py-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-gray-700">{exame.replace(/_/g, ' ')}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-blue-600">{l.loinc}</span>
                          {l.unit && <span className="text-gray-400">{l.unit}</span>}
                        </div>
                      </div>
                      <p className="text-gray-500 truncate text-xs">{l.display}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ABA SIMULADOR */}
        {aba === 'simulador' && (
          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-2xl p-5">
              <p className="text-sm font-bold text-gray-700 mb-3">Simulador de Integração Hospitalar</p>
              <p className="text-xs text-gray-500 mb-4">Simula a troca de dados entre PRESCREVE-AI e sistemas hospitalares via diferentes protocolos.</p>
              <button onClick={handleSimular}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-all">
                <Zap size={14} />Executar Simulação Completa
              </button>
            </div>

            {simulacoes.length > 0 && (
              <div className="space-y-3">
                {simulacoes.map((s, i) => (
                  <div key={i} className={`bg-white border rounded-2xl p-4 ${s.sucesso ? 'border-emerald-200' : 'border-red-200'}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          {s.sucesso
                            ? <CheckCircle2 size={14} className="text-emerald-600" />
                            : <AlertTriangle size={14} className="text-amber-600" />}
                          <span className="text-sm font-bold text-gray-800">{s.sistema_origem} → {s.sistema_destino}</span>
                          <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded font-bold">{s.protocolo}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 ml-5">{s.mensagem}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-xl font-black ${s.score_interoperabilidade >= 95 ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {s.score_interoperabilidade}
                        </p>
                        <p className="text-xs text-gray-400">score</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-400 ml-5">
                      <span>{s.recursos_transferidos} recursos</span>
                      <span>{s.duracao_ms}ms</span>
                      {s.erros_encontrados > 0 && <span className="text-amber-600">{s.erros_encontrados} erro(s)</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ABA HL7 */}
        {aba === 'hl7' && (
          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-2xl p-5">
              <p className="text-sm font-bold text-gray-700 mb-3">Conversor HL7 v2.x → FHIR R4</p>
              {(() => {
                const hl7msg = {
                  msh: { sending_app: 'HIS_HOSPITAL', receiving_app: 'PRESCREVE_AI', timestamp: new Date().toISOString(), message_type: 'ORU^R01' },
                  pid: { patient_id: 'P-9876', name: 'Maria Oliveira', dob: '1972-08-20', sex: 'F' },
                  obr: { observation_id: 'LAB-001', description: 'Painel metabólico', datetime: new Date().toISOString() },
                  obx: [
                    { loinc: '1558-6', value: '132', unit: 'mg/dL', flag: 'H' },
                    { loinc: '4548-4', value: '7.8', unit: '%', flag: 'H' },
                    { loinc: '2160-0', value: '0.9', unit: 'mg/dL' },
                  ],
                };
                const bundle = converterHL7(hl7msg);
                return (
                  <div className="space-y-3">
                    <div className="bg-gray-900 text-green-400 text-xs p-3 rounded-lg font-mono">
                      <p className="text-gray-400 mb-1">// Mensagem HL7 v2.x entrada (simplificada)</p>
                      <p>MSH|^~\&|{hl7msg.msh.sending_app}|{hl7msg.msh.receiving_app}</p>
                      <p>PID|1||{hl7msg.pid?.patient_id}||{hl7msg.pid?.name}||{hl7msg.pid?.dob}|{hl7msg.pid?.sex}</p>
                      {hl7msg.obx?.map((o, i) => (
                        <p key={i}>OBX|{i+1}|NM|{o.loinc}^^LN||{o.value}|{o.unit}|||{o.flag ?? 'N'}|||F</p>
                      ))}
                    </div>
                    <div className="flex items-center justify-center gap-2 text-gray-400">
                      <div className="h-px flex-1 bg-gray-200" />
                      <RefreshCw size={14} className="text-blue-500" />
                      <span className="text-xs font-bold text-blue-600">Convertido → FHIR R4</span>
                      <div className="h-px flex-1 bg-gray-200" />
                    </div>
                    {bundle && (
                      <div className="bg-gray-50 rounded-lg p-3 text-xs">
                        <p className="font-bold text-gray-700 mb-2">Bundle FHIR gerado</p>
                        <p className="text-gray-500">resourceType: Bundle · entries: {bundle.entry.length}</p>
                        <p className="text-gray-500">Patient: {hl7msg.pid?.name} · {bundle.entry.filter(e => e.resource.resourceType === 'Observation').length} Observations</p>
                        <div className="mt-2 flex items-center gap-1 text-emerald-600 font-bold">
                          <CheckCircle2 size={12} />
                          <span>Conversão concluída — FHIR R4 válido</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
