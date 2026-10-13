import { canonicalDestination } from "../data/navigation";
import { ArrowUpRight } from "lucide-react";
import { destinations } from "../context/NavigationContext";
import { navigate } from "../lib/router";
const connections: Record<string, string[]> = {
  "/": ["/hoje", "/calendario", "/inbox"],
  "/hoje": ["/rotinas", "/calendario", "/saude"],
  "/missoes": ["/projetos", "/inbox", "/foco"],
  "/projetos": ["/metas", "/missoes", "/planejamento"],
  "/estudos": ["/calendario", "/foco", "/conhecimento"],
  "/foco": ["/missoes", "/estudos", "/insights"],
  "/rotinas": ["/hoje", "/saude", "/revisao"],
  "/insights": ["/revisao", "/historico", "/saude"],
  "/revisao": ["/insights", "/planejamento", "/historico"],
  "/metas": ["/projetos", "/planejamento", "/revisao"],
  "/saude": ["/hoje", "/rotinas", "/insights"],
  "/financas": ["/planejamento", "/historico"],
  "/conhecimento": ["/biblioteca", "/inbox", "/estudos"],
  "/biblioteca": ["/conhecimento", "/estudos", "/inbox"],
  "/planejamento": ["/projetos", "/calendario", "/revisao"],
  "/historico": ["/revisao", "/insights"],
  "/calendario": ["/hoje", "/estudos", "/planejamento"],
  "/inbox": ["/missoes", "/projetos", "/conhecimento"],
  "/life-rpg": ["/missoes", "/projetos", "/insights"],
  "/tutorial": ["/", "/hoje", "/inbox"],
};
export function RelatedAreas({ pathname }: { pathname: string }) {
  const paths = connections[canonicalDestination(pathname)];
  if (!paths) return null;
  return (
    <nav className="related-areas" aria-label="Áreas relacionadas">
      <span>Continue por aqui</span>
      {paths.map((path) => {
        const d = destinations.find((d) => d.path === path)!;
        const Icon = d.icon;
        return (
          <button key={path} onClick={() => navigate(path)}>
            <Icon size={16} />
            {d.label}
            <ArrowUpRight size={13} />
          </button>
        );
      })}
    </nav>
  );
}
