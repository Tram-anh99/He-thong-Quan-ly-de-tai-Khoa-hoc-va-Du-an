import { Prisma, Role } from "@prisma/client";

export type Actor = { id: string; role: Role };
export function projectScope(user: Actor): Prisma.ProjectWhereInput {
     if (user.role === Role.ADMIN || user.role === Role.MANAGER || user.role === Role.ACCOUNTANT) return {};
     if (user.role === Role.PI) return { ownerId: user.id };
     return { members: { some: { userId: user.id } } };
}
export function canEditProject(user: Actor, ownerId: string): boolean {
     return user.role === Role.ADMIN || user.role === Role.MANAGER || (user.role === Role.PI && ownerId === user.id);
}
export function canCreateProject(user: Actor): boolean {
     return user.role === Role.ADMIN || user.role === Role.MANAGER || user.role === Role.PI;
}
export function canArchiveProject(user: Actor): boolean {
     return user.role === Role.ADMIN || user.role === Role.MANAGER;
}

// Member responses must not carry total project finances or another member's pay.
export function projectListView<T extends { totalBudget: unknown; ownerId: string }>(project: T, user: Actor) {
     if (user.role !== Role.RESEARCHER) return project;
     const { totalBudget: _budget, ...visible } = project;
     return visible;
}
