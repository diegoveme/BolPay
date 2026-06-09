import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface HealthResponse {
  status: string;
  service: string;
}

/** Smoke-test view: confirms the web client can reach the NestJS API. */
export function HomePage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['health'],
    queryFn: async () => {
      const res = await api.get<HealthResponse>('/health');
      return res.data;
    },
  });

  return (
    <section>
      <h1>BolPay</h1>
      <p>Trustless freelance contracting + on-chain payroll on Stellar.</p>
      <p>
        API status:{' '}
        {isLoading
          ? 'checking…'
          : isError
            ? 'unreachable (is the backend running?)'
            : (data?.status ?? 'unknown')}
      </p>
    </section>
  );
}
