import { StellarSpark } from "../components/CosmicEnvironment";
import { ExecutionWorkbench } from "../components/ExecutionWorkbench";
export function PlanningPage() {
  return (
    <div className="page-stack planning-page">
      <header className="orbital-heading">
        <div>
          <span className="eyebrow">Decidir · preparar · executar</span>
          <h1>
            Planejamento
            <StellarSpark />
          </h1>
          <p>
            Uma sequência possível a partir das suas missões, projetos e agenda.
            Ajuste o recorte e leve o próximo passo ao Foco.
          </p>
        </div>
      </header>
      <ExecutionWorkbench />
    </div>
  );
}
