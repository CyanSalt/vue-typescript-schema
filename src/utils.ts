const windowsPathReg = /\\/g
export function normalizePath(path: string) {
  return path.replace(windowsPathReg, '/')
}
