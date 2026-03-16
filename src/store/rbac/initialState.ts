import type { RbacState } from './slices/rbac';
import { initialRbacState } from './slices/rbac';

export type RbacStoreState = RbacState;

export const initialState: RbacStoreState = {
  ...initialRbacState,
};
