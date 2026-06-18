'use client';

import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { BookOpen, Search, ExternalLink, Award, TrendingUp } from 'lucide-react';
import { NIVEL_EVIDENCIA, GRAU_RECOMENDACAO } from '@/lib/utils';
import { useState } from 'react';

const DIRETRIZES = [
  {
    id: '1',
    titulo: '7ª Diretriz Brasileira de Hipertensão Arterial',
    sociedade: 'Sociedade Brasileira de Cardiologia (SBC)',
    ano: 2020,
    area: 'Cardiologia',
    link: 'https://doi.org/10.36660/abc.20201238',
    topicos: ['Hipertensão Arterial', 'Anti-hipertensivos', 'Meta pressórica', 'Síndrome Metabólica'],
  },
  {
    id: '2',
    titulo: 'Diretrizes da Sociedade Brasileira de Diabetes 2023-2024',
    sociedade: 'Sociedade Brasileira de Diabetes (SBD)',
    ano: 2023,
    area: 'Endocrinologia',
    link: 'https://diretriz.diabetes.org.br/',
    topicos: ['Diabetes Mellitus Tipo 2', 'Insulinoterapia', 'Antidiabéticos orais', 'HbA1c'],
  },
  {
    id: '3',
    titulo: 'V Diretriz Brasileira de Dislipidemias',
    sociedade: 'Sociedade Brasileira de Cardiologia (SBC)',
    ano: 2013,
    area: 'Cardiologia / Endocrinologia',
    link: 'https://doi.org/10.5935/abc.2013S010',
    topicos: ['Dislipidemia', 'Estatinas', 'LDL', 'Risco cardiovascular'],
  },
  {
    id: '4',
    titulo: 'ESC Guidelines for the Management of Heart Failure 2021',
    sociedade: 'European Society of Cardiology (ESC)',
    ano: 2021,
    area: 'Cardiologia',
    link: 'https://doi.org/10.1093/eurheartj/ehab368',
    topicos: ['Insuficiência Cardíaca', 'IC-FEr', 'Betabloqueadores', 'IECA/BRA'],
  },
  {
    id: '5',
    titulo: 'Protocolo Clínico e Diretrizes Terapêuticas — DPOC',
    sociedade: 'Ministério da Saúde / CONITEC',
    ano: 2022,
    area: 'Pneumologia',
    link: 'https://www.gov.br/saude/pt-br',
    topicos: ['DPOC', 'Broncodilatadores', 'Corticosteroides inalatórios', 'Reabilitação pulmonar'],
  },
  {
    id: '6',
    titulo: 'Diretrizes Brasileiras para o Tratamento da Asma',
    sociedade: 'Sociedade Brasileira de Pneumologia (SBPT)',
    ano: 2020,
    area: 'Pneumologia',
    link: 'https://doi.org/10.36416/1806-3756/e20190160',
    topicos: ['Asma', 'Controle da asma', 'Corticosteroides', 'Beta-2 agonistas'],
  },
];

const NIVEIS = [
  { nivel: 'A', descricao: 'Múltiplos ECRs ou meta-análises', color: 'bg-green-100 text-green-700' },
  { nivel: 'B', descricao: 'ECR único ou estudos observacionais', color: 'bg-blue-100 text-blue-700' },
  { nivel: 'C', descricao: 'Consenso de especialistas', color: 'bg-yellow-100 text-yellow-700' },
  { nivel: 'D', descricao: 'Opinião de especialistas', color: 'bg-slate-100 text-slate-600' },
];

export default function Evidencias() {
  const [search, setSearch] = useState('');

  const filtered = DIRETRIZES.filter(d =>
    d.titulo.toLowerCase().includes(search.toLowerCase()) ||
    d.sociedade.toLowerCase().includes(search.toLowerCase()) ||
    d.topicos.some(t => t.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <AppShell>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-blue-600" />
            Base de Evidências
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Diretrizes e evidências científicas que fundamentam as recomendações do sistema
          </p>
        </div>

        {/* Níveis de evidência */}
        <div className="grid grid-cols-4 gap-3 mb-8">
          {NIVEIS.map(n => (
            <Card key={n.nivel}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${n.color}`}>
                    Nível {n.nivel}
                  </span>
                </div>
                <p className="text-xs text-slate-600">{n.descricao}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-6 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            className="pl-10"
            placeholder="Buscar diretrizes, áreas, tópicos..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Diretrizes */}
        <div className="space-y-3">
          {filtered.map(d => (
            <Card key={d.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Award className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">{d.titulo}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{d.sociedade} — {d.ano}</p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                          {d.area}
                        </span>
                        {d.topicos.map(t => (
                          <span key={t} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <a
                    href={d.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-blue-600 hover:underline flex-shrink-0 mt-1"
                  >
                    Acessar <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <TrendingUp className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhuma diretriz encontrada</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
