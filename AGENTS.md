# Project Architecture

- Use `ProfileAvatar` for user photos so Dishyo+ frames and badges remain consistent across social surfaces.
- Keep reaction catalogs in `dishyo-db.ts`; database triggers remain the authority for Dishyo+ reaction access.