import Image from "next/image";

import type { Metric } from "@/lib/services/raking";

type MetricsProps = {
  metrics?: Metric[];
};

export function Metrics({ metrics = [] }: MetricsProps) {
  return (
    <section className="metric-grid" aria-label="Activity statistics">
      {metrics.map((metric) => (
        <article className="metric-card" key={metric.label}>
          <div className="metric-top">
            <div>
              <p className="metric-label">{metric.label}</p>
              <p className="metric-value">{metric.value}</p>
            </div>
            <span className="metric-icon-frame" aria-hidden="true">
              <Image
                className="metric-icon"
                src={metric.icon}
                alt=""
                width={64}
                height={64}
              />
            </span>
          </div>
          <div>
            <p className="metric-detail">{metric.detail}</p>
          </div>
        </article>
      ))}
    </section>
  );
}
