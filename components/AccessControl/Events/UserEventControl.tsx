// Alias: UserEventControl agora usa o mesmo EventControl unificado.
// A distinção admin vs. usuário é feita internamente pelo EventControl
// com base no papel (role) do usuário.
export { default } from './EventControl';
