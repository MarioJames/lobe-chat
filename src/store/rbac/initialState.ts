import { RbacState, initialRbacState } from './slices/rbac';

export type RbacStoreState = RbacState;

export const initialState: RbacStoreState = {
  ...initialRbacState,
};
