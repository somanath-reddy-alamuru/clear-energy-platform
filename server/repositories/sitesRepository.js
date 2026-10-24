import { sites } from "../data/sites.js";

const copySite = (site) => ({ ...site });

export function findAll() {
  return sites.map(copySite);
}

export function findById(id) {
  const site = sites.find((item) => item.id === id);

  return site ? copySite(site) : null;
}

export function create(siteData) {
  const nextId =
    sites.reduce((maximum, site) => Math.max(maximum, site.id), 0) + 1;

  const newSite = {
    id: nextId,
    ...siteData
  };

  sites.push(newSite);

  return copySite(newSite);
}

export function replaceById(id, siteData) {
  const index = sites.findIndex((item) => item.id === id);

  if (index === -1) {
    return null;
  }

  const updatedSite = {
    id,
    ...siteData
  };

  sites[index] = updatedSite;

  return copySite(updatedSite);
}

export function patchById(id, updates) {
  const index = sites.findIndex((item) => item.id === id);

  if (index === -1) {
    return null;
  }

  sites[index] = {
    ...sites[index],
    ...updates
  };

  return copySite(sites[index]);
}

export function deleteById(id) {
  const index = sites.findIndex((item) => item.id === id);

  if (index === -1) {
    return null;
  }

  const [deletedSite] = sites.splice(index, 1);

  return copySite(deletedSite);
}