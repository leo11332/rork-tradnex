type EnvMap = Record<string, string | undefined>;

interface GlobalWithProcess {
  process?: {
    env?: EnvMap;
  };
}

export function getEnv(name: string) {
  const globalObject = globalThis as GlobalWithProcess;
  return globalObject.process?.env?.[name] ?? '';
}
