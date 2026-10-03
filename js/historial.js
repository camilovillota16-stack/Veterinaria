const panelHistorial = document.querySelector('#panel-historial');
const listaHistorial = document.querySelector('#lista-historial');
const estadoHistorial = document.querySelector('#estado-historial');
const recargarHistorial = document.querySelector('#recargar-historial');
let pacienteHistorial = null;
let revisionHistorial = 0;

async function abrirHistorial(mascota, desplazar = true) {
  pacienteHistorial = mascota;
  const revision = ++revisionHistorial;
  panelHistorial.hidden = false;
  document.querySelector('#titulo-historial').textContent = `Historial de ${mascota.nombre}`;
  document.querySelector('#paciente-historial').textContent = `${mascota.especie} · Propietario: ${mascota.propietario} · Mascota #${mascota.id}`;
  document.querySelector('#contador-historial').textContent = '…';
  listaHistorial.replaceChildren();
  estadoHistorial.textContent = 'Cargando consultas guardadas…';
  recargarHistorial.disabled = true;
  if (desplazar) panelHistorial.scrollIntoView({ block: 'start' });
  try {
    const respuesta = await fetch(`/api/mascotas/${mascota.id}/historial`);
    const resultado = await respuesta.json();
    if (!respuesta.ok) throw new Error(resultado.error || 'No se pudo cargar el historial.');
    if (revision !== revisionHistorial) return;
    document.querySelector('#contador-historial').textContent = resultado.cantidad;
    estadoHistorial.textContent = resultado.cantidad ? 'Consultas de la más reciente a la más antigua.' : 'Esta mascota todavía no tiene consultas finalizadas.';
    resultado.consultas.forEach((consulta) => listaHistorial.append(tarjetaConsulta(consulta)));
  } catch (error) {
    if (revision !== revisionHistorial) return;
    document.querySelector('#contador-historial').textContent = '—';
    estadoHistorial.textContent = `${error.message} Pulsa Actualizar historial para reintentar.`;
  } finally {
    if (revision === revisionHistorial) recargarHistorial.disabled = false;
  }
}

function tarjetaConsulta(consulta) {
  const tarjeta = document.createElement('article');
  tarjeta.className = 'consultation-card';
  const titulo = document.createElement('h3');
  const fecha = new Date(consulta.fecha);
  titulo.textContent = `Visita #${consulta.turnoId} · ${Number.isNaN(fecha.getTime()) ? consulta.fecha : fecha.toLocaleString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'medium', timeStyle: 'short' })}`;
  tarjeta.append(titulo);
  const textos = [
    `Veterinario: ${consulta.veterinario || 'Sin registro'}`,
    `Servicios: ${consulta.servicios.map((s) => s.nombre).join(' · ')}`,
    `Atención: ${consulta.tipo === 'urgente' ? `Urgente · prioridad ${consulta.prioridad}` : 'Normal'}`,
    `Motivo: ${consulta.motivo || 'Sin especificar'}`,
    `Observaciones: ${consulta.observaciones || 'Sin observaciones registradas'}`,
  ];
  if (consulta.origen === 'anterior') textos.push('Visita anterior a la función de historial; se recuperaron los datos disponibles.');
  textos.forEach((texto) => {
    const parrafo = document.createElement('p');
    parrafo.textContent = texto;
    tarjeta.append(parrafo);
  });
  return tarjeta;
}
recargarHistorial.addEventListener('click', () => { if (pacienteHistorial) abrirHistorial(pacienteHistorial, false); });
document.querySelector('#ocultar-historial').addEventListener('click', () => {
  revisionHistorial++;
  panelHistorial.hidden = true;
});
window.addEventListener('hashchange', () => {
  if (location.hash === '#mascotas' && pacienteHistorial && !panelHistorial.hidden) abrirHistorial(pacienteHistorial, false);
});
