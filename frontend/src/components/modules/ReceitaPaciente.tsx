// ============================================================
// RM-105.2 — Receita do PACIENTE (parte 1 da impressão)
//
// Componente deliberadamente SEM acesso a dados do motor de segurança: não recebe `SafetyCheckResult`,
// alertas, cobertura, contexto nem alergias. Isso garante, por construção (e por teste), que nenhuma
// informação técnica vaza para a via do paciente. A apresentação é a mesma da receita anterior.
// ============================================================

export interface ReceitaPacienteInfo {
  nome: string;
  idade: string;
  diagnostico: string;
}

export interface ReceitaItem {
  id: string;
  molecula: string;
  nome_comercial: string;
  concentracao: string;
  forma_farmaceutica: string;
  dose: string;
  via: string;
  frequencia: string;
  duracao: string;
  instrucoes: string;
  uso_continuo: boolean;
}

export interface ReceitaMedico {
  nome: string;
  crm: string;
  especialidade: string;
  endereco?: string;
  telefone?: string;
}

export function ReceitaPaciente({
  patient, items, medico, hoje,
}: {
  patient: ReceitaPacienteInfo;
  items: ReceitaItem[];
  medico: ReceitaMedico;
  hoje: string;
}) {
  return (
    <div className="p-8" id="print-area" data-print-part="receita">
      {/* Header médico */}
      <div className="border-b-2 border-slate-900 pb-4 mb-6">
        <h2 className="text-lg font-bold text-slate-900">{medico.nome || 'Dr. Médico'}</h2>
        <p className="text-sm text-slate-600">{medico.especialidade || 'Clínica Médica'} · CRM: {medico.crm || '000000'}</p>
        {medico.endereco && <p className="text-xs text-slate-500">{medico.endereco}</p>}
        {medico.telefone && <p className="text-xs text-slate-500">Tel: {medico.telefone}</p>}
      </div>

      {/* Dados do paciente */}
      <div className="mb-6">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-slate-500">Paciente:</span>
            <span className="font-semibold ml-1 text-slate-900">{patient.nome || '_______________'}</span>
          </div>
          {patient.idade && <div><span className="text-slate-500">Idade:</span><span className="font-medium ml-1">{patient.idade}</span></div>}
          {patient.diagnostico && <div><span className="text-slate-500">CID/Diagnóstico:</span><span className="font-medium ml-1 text-xs">{patient.diagnostico}</span></div>}
        </div>
      </div>

      {/* Título */}
      <div className="text-center mb-6">
        <p className="text-base font-bold text-slate-800 uppercase tracking-widest border border-slate-300 inline-block px-6 py-1 rounded">
          RECEITA MÉDICA
        </p>
      </div>

      {/* Medicamentos */}
      <div className="space-y-5">
        {items.map((item, i) => (
          <div key={item.id} className="break-inside-avoid" data-receita-item>
            <p className="font-bold text-slate-900">
              {i + 1}. {item.nome_comercial || item.molecula}
              {item.concentracao && ` ${item.concentracao}`}
              {item.forma_farmaceutica && ` — ${item.forma_farmaceutica}`}
            </p>
            <p className="text-sm text-slate-700 ml-4">
              {item.dose} · {item.via} · {item.frequencia}
              {item.duracao && ` · por ${item.duracao}`}
              {item.uso_continuo && ' · USO CONTÍNUO'}
            </p>
            {item.instrucoes && (
              <p className="text-xs text-slate-500 ml-4 italic">{item.instrucoes}</p>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-12 pt-6 border-t border-slate-200 break-inside-avoid">
        <div className="flex justify-between text-sm text-slate-600">
          <div>
            <p className="text-xs text-slate-400">Gerado por PRESCREVE-AI</p>
            <p className="text-xs text-slate-300">Apoio à decisão clínica — responsabilidade do médico prescritor</p>
          </div>
          <div className="text-right">
            <p>{hoje}</p>
            <div className="mt-8 border-t border-slate-400 pt-1 w-48 text-center">
              <p className="text-xs text-slate-500">Assinatura e carimbo</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
