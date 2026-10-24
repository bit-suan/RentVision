import type {
  ListingsRepositoryInterface,
} from "../repositories/listings-repository-interface";

import {
  ListingsService,
} from "./listings-service";

export function createListingsService(
  repository: ListingsRepositoryInterface,
): ListingsService {
  return new ListingsService(repository);
}