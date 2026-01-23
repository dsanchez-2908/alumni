const { verificarConfiguracionEmail } = require('./lib/email');

async function testEmail() {
  console.log('🔧 Verificando configuración de email...\n');
  
  try {
    const isValid = await verificarConfiguracionEmail();
    
    if (isValid) {
      console.log('✅ Configuración de email verificada correctamente!');
      console.log('   - Host: l0070839.ferozo.com');
      console.log('   - Puerto: 465 (SSL)');
      console.log('   - Usuario: contacto@indigoteatro.com.ar');
    } else {
      console.log('❌ Error en la configuración de email');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testEmail();
