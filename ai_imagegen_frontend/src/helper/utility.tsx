export const truncate = (str: string, max: number = 12) => {
    return str.length > max ? str.slice(0, max) + "…" : str;
  };
  