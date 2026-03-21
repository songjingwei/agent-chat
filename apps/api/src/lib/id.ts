export const createId = (prefix: string): string => {
  const token = crypto.randomUUID().replaceAll("-", "");
  return `${prefix}_${token}`;
};
