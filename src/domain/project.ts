import type {
  BannerStyleId,
  RegistryProject,
  RegistryTweak,
  ThemeId,
} from "./types.ts";

export interface ProjectIdentity {
  readonly title: string;
  readonly bannerText: string;
  readonly bannerStyle: BannerStyleId;
  readonly subtitle: string;
  readonly theme: ThemeId;
}

export function updateIdentity(
  project: RegistryProject,
  identity: ProjectIdentity,
): RegistryProject {
  return { ...project, ...identity };
}

export function addTweak(
  project: RegistryProject,
  tweak: RegistryTweak,
): RegistryProject {
  return { ...project, tweaks: [...project.tweaks, tweak] };
}

export function updateTweak(
  project: RegistryProject,
  tweak: RegistryTweak,
): RegistryProject {
  return {
    ...project,
    tweaks: project.tweaks.map((candidate) =>
      candidate.id === tweak.id ? tweak : candidate,
    ),
  };
}

export function removeTweak(
  project: RegistryProject,
  tweakId: string,
): RegistryProject {
  return {
    ...project,
    tweaks: project.tweaks.filter((tweak) => tweak.id !== tweakId),
  };
}
