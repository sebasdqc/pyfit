// Genera un slug legible a partir de un título — usado por los formularios de
// creación de curso (InstructorPage) y de post del blog (BlogInstructorPage)
// para proponer el identificador de URL mientras el autor escribe.
export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quita acentos/diacríticos
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}
