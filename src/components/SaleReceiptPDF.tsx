import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

const redColor = '#dc2626'; 
const pinkColor = '#fecaca';

const styles = StyleSheet.create({
  page: { 
    paddingTop: 30,
    paddingLeft: 40,
    paddingRight: 40,
    paddingBottom: 40,
    fontFamily: 'Helvetica', 
    fontSize: 10, 
    color: '#000000',
  },
  topRedBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 15,
    backgroundColor: redColor
  },
  headerRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 5,
  },
  logoBox: { width: 260, height: 75 },
  logoImg: { width: '100%', height: '100%', objectFit: 'contain' },
  headerRight: { 
    alignItems: 'flex-end',
    width: 200,
  },
  mainTitle: { 
    fontFamily: 'Helvetica-Bold',
    fontSize: 28, 
    color: '#374151',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  infoHLabel: { 
    fontSize: 11, 
    fontFamily: 'Helvetica-Bold',
    color: '#1e3a8a',
    marginBottom: 4 
  },
  infoHValue: { 
    fontSize: 11, 
    width: 120,
    textAlign: 'center',
    paddingTop: 3,
    marginBottom: 8,
    color: '#000000',
  },
  borderTop: {
    borderTopWidth: 1,
    borderTopColor: '#000000',
    borderTopStyle: 'solid',
  },
  topInfoBlock: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  infoColumn: {
    width: '48%'
  },
  infoTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#1e3a8a',
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    borderBottomStyle: 'solid',
    paddingBottom: 2,
    marginBottom: 6,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  infoLabel: {
    width: 60,
    fontSize: 10,
    color: '#475569',
    fontFamily: 'Helvetica-Bold',
  },
  infoValue: {
    flex: 1,
    fontSize: 10,
    color: '#000000',
    textTransform: 'uppercase'
  },
  table: { 
    width: '100%', 
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'solid',
    borderRadius: 4,
    overflow: 'hidden'
  },
  tHead: { 
    flexDirection: 'row', 
    backgroundColor: redColor,
    color: '#ffffff',
    fontFamily: 'Helvetica-Bold',
    fontSize: 11,
  },
  thCol1: { width: '15%', padding: 5, textAlign: 'center' },
  thCol2: { width: '50%', padding: 5, textAlign: 'center' },
  thCol3: { width: '17.5%', padding: 5, textAlign: 'center' },
  thCol4: { width: '17.5%', padding: 5, textAlign: 'center' },
  tRow: { 
    flexDirection: 'row', 
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    borderTopStyle: 'solid',
    fontSize: 10
  },
  tRowOdd: { backgroundColor: '#f8fafc' },
  tRowEven: { backgroundColor: '#ffffff' },
  tdCol1: { width: '15%', padding: 4, textAlign: 'center', borderRightWidth: 1, borderRightColor: '#e2e8f0' },
  tdCol2: { width: '50%', padding: 4, paddingLeft: 6, borderRightWidth: 1, borderRightColor: '#e2e8f0', textTransform: 'uppercase' },
  tdCol3: { width: '17.5%', padding: 4, textAlign: 'right', borderRightWidth: 1, borderRightColor: '#e2e8f0' },
  tdCol4: { width: '17.5%', padding: 4, textAlign: 'right' },
  
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 10
  },
  footerLeft: {
    width: '50%'
  },
  totalsBox: { 
    width: 200,
    alignSelf: 'flex-end',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    overflow: 'hidden'
  },
  totRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    borderBottomStyle: 'solid'
  },
  totLabel: { 
    color: '#475569',
    fontSize: 10,
    textAlign: 'right',
    flex: 1,
    paddingRight: 15,
    paddingVertical: 4
  },
  totValue: { 
    textAlign: 'right',
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#000000',
    width: 80,
    paddingVertical: 4,
    paddingRight: 6,
    backgroundColor: '#ffffff',
    borderLeftWidth: 1,
    borderLeftColor: '#e2e8f0',
  },
  totRowPinkContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: pinkColor,
  },
  totLabelPink: {
    fontFamily: 'Helvetica-Bold',
    color: redColor,
    fontSize: 12,
    textAlign: 'right',
    flex: 1,
    paddingRight: 15,
    paddingTop: 6,
    paddingBottom: 6
  },
  totValuePinkCell: {
    textAlign: 'right',
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: redColor,
    width: 80,
    paddingTop: 6,
    paddingBottom: 6,
    paddingRight: 6,
    borderLeftWidth: 1,
    borderLeftColor: '#f87171',
    borderLeftStyle: 'solid'
  },
  redBanner: {
    backgroundColor: redColor,
    color: '#fff',
    padding: 3,
    textAlign: 'center',
    fontFamily: 'Helvetica-Bold',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 15,
    fontSize: 8,
  }
});

const formatNum = (num: number) => {
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const SaleReceiptPDF = ({ sale }: { sale: any }) => {
  const date = sale.date ? new Date(sale.date).toLocaleDateString() : new Date().toLocaleDateString();
  const items = sale.items || [];
  const emptyRowsCount = Math.max(0, 10 - items.length);
  const emptyRows = Array.from({ length: emptyRowsCount });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.topRedBanner} />

        <View style={styles.headerRow}>
          <View style={styles.logoBox}>
            <Image src="/logo.png" style={styles.logoImg} />
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.mainTitle}>TICKET VENTA</Text>
            <Text style={styles.infoHLabel}>Fecha</Text>
            <Text style={[styles.infoHValue, styles.borderTop]}>{date}</Text>
            <Text style={styles.infoHLabel}>Folio</Text>
            <Text style={[styles.infoHValue, styles.borderTop]}>#{String(sale.id).slice(0, 8).toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.topInfoBlock}>
          <View style={styles.infoColumn}>
             <View style={styles.infoTitle}><Text>Cliente</Text></View>
             <View style={styles.infoRow}>
               <Text style={styles.infoLabel}>Nombre:</Text>
               <Text style={styles.infoValue}>{sale.client_name || sale.clientName || 'Público General'}</Text>
             </View>
             <View style={styles.infoRow}>
               <Text style={styles.infoLabel}>Pago:</Text>
               <Text style={styles.infoValue}>{sale.payment_method || sale.paymentMethod || 'Efectivo'}</Text>
             </View>
          </View>
          <View style={styles.infoColumn}>
             <View style={styles.infoTitle}><Text>Establecimiento</Text></View>
             <Text style={{fontSize: 9, color: '#444'}}>Multiservicio Automotriz de Cajeme</Text>
             <Text style={{fontSize: 9, color: '#444'}}>Calle 6 de Abril #516, Col. Centro</Text>
             <Text style={{fontSize: 9, color: '#444'}}>Tel: 6441452026</Text>
          </View>
        </View>

        <View style={styles.table}>
           <View style={styles.tHead}>
             <Text style={styles.thCol1}>CANT</Text>
             <Text style={styles.thCol2}>DESCRIPCIÓN</Text>
             <Text style={styles.thCol3}>P. UNIT</Text>
             <Text style={styles.thCol4}>TOTAL</Text>
           </View>
           {items.map((item: any, i: number) => (
             <View key={i} style={[styles.tRow, i % 2 === 0 ? styles.tRowEven : styles.tRowOdd]}>
               <Text style={styles.tdCol1}>{item.quantity}</Text>
               <Text style={styles.tdCol2}>{item.brand} {item.type}</Text>
               <Text style={styles.tdCol3}>{formatNum(Number(item.price))}</Text>
               <Text style={styles.tdCol4}>{formatNum(Number(item.price) * Number(item.quantity))}</Text>
             </View>
           ))}
           {emptyRows.map((_, i) => (
             <View key={`e-${i}`} style={[styles.tRow, (items.length + i) % 2 === 0 ? styles.tRowEven : styles.tRowOdd]}>
               <Text style={styles.tdCol1}> </Text><Text style={styles.tdCol2}> </Text><Text style={styles.tdCol3}> </Text><Text style={styles.tdCol4}> </Text>
             </View>
           ))}
        </View>

        <View style={styles.footerContainer}>
            <View style={{width: '50%'}}>
               <Text style={{fontSize: 8, color: '#666', marginTop: 10}}>* Este comprobante no es una factura fiscal.</Text>
               <Text style={{fontSize: 8, color: '#666'}}>* Gracias por su preferencia.</Text>
            </View>
            <View style={styles.totalsBox}>
               <View style={styles.totRow}>
                 <Text style={styles.totLabel}>Subtotal</Text>
                 <Text style={styles.totValue}>{formatNum(sale.total)}</Text>
               </View>
               <View style={[styles.totRowPinkContainer, { borderTopWidth: 0, marginTop: 4 }]}>
                 <Text style={styles.totLabelPink}>Total Pagado</Text>
                 <Text style={styles.totValuePinkCell}>${formatNum(sale.total)}</Text>
               </View>
            </View>
        </View>

        <Text style={styles.redBanner}>EXCELENCIA AUTOMOTRIZ</Text>
      </Page>
    </Document>
  );
};
