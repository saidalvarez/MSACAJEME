import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { formatCurrency } from '../utils/format';
import type { Ticket } from '../context/TicketContext';
import type { Expense } from '../context/ExpenseContext';

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10, color: '#1e293b' },
  header: { borderBottom: '1 solid #e2e8f0', paddingBottom: 15, marginBottom: 20 },
  title: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: '#0f172a' },
  subtitle: { fontSize: 12, color: '#64748b', marginTop: 4 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 14, fontFamily: 'Helvetica-Bold', marginBottom: 10, color: '#334155' },
  table: { display: 'flex', flexDirection: 'column', width: '100%' },
  tHead: { display: 'flex', flexDirection: 'row', backgroundColor: '#f1f5f9', padding: 6, fontFamily: 'Helvetica-Bold', borderBottom: '1 solid #cbd5e1' },
  tRow: { display: 'flex', flexDirection: 'row', padding: 6, borderBottom: '1 solid #f1f5f9' },
  col1: { width: '40%' },
  col2: { width: '30%', textAlign: 'center' },
  col3: { width: '30%', textAlign: 'right' },
  totalsCard: { backgroundColor: '#f8fafc', padding: 15, borderRadius: 5, marginTop: 10, border: '1 solid #e2e8f0' },
  totalRow: { display: 'flex', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  netGainRow: { display: 'flex', flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTop: '1 solid #cbd5e1', fontFamily: 'Helvetica-Bold', fontSize: 14 }
});

interface FinancesPDFProps {
  monthYear: string;
  tickets: Ticket[];
  expenses: Expense[];
}

export const FinancesPDF = ({ monthYear, tickets, expenses }: FinancesPDFProps) => {
  const extraIncome = expenses.filter(e => e.type === 'income').reduce((acc, e) => acc + e.amount, 0);
  const totalIncome = tickets.reduce((acc, t) => acc + t.total, 0) + extraIncome;
  const totalExpenses = expenses.filter(e => !e.type || e.type === 'expense').reduce((acc, e) => acc + e.amount, 0);
  const netIncome = totalIncome - totalExpenses;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Reporte Financiero Mensual</Text>
          <Text style={styles.subtitle}>Multiservicios Automotriz de Cajeme · {monthYear}</Text>
        </View>

        {/* Resumen */}
        <View style={styles.totalsCard}>
          <View style={styles.totalRow}>
            <Text style={{ color: '#64748b' }}>Ingresos Brutos (Tickets + Extras):</Text>
            <Text>{formatCurrency(totalIncome)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={{ color: '#64748b' }}>Gastos Totales Registrados:</Text>
            <Text style={{ color: '#ef4444' }}>- {formatCurrency(totalExpenses)}</Text>
          </View>
          <View style={styles.netGainRow}>
            <Text>Ganancia Neta del Mes:</Text>
            <Text style={{ color: netIncome >= 0 ? '#10b981' : '#ef4444' }}>{formatCurrency(netIncome)}</Text>
          </View>
        </View>

        {/* Ingresos (Tickets) */}
        <View style={[styles.section, { marginTop: 25 }]}>
          <Text style={styles.sectionTitle}>Desglose de Ingresos (Tickets)</Text>
          <View style={styles.table}>
            <View style={styles.tHead}>
              <Text style={styles.col1}>Cliente / Nota</Text>
              <Text style={styles.col2}>Fecha</Text>
              <Text style={styles.col3}>Monto</Text>
            </View>
            {tickets.map(t => (
              <View style={styles.tRow} key={t.id}>
                <Text style={styles.col1}>{t.clientName}</Text>
                <Text style={styles.col2}>{new Date(t.date).toLocaleDateString()}</Text>
                <Text style={styles.col3}>{formatCurrency(t.total)}</Text>
              </View>
            ))}
            {tickets.length === 0 && (
              <Text style={{ padding: 10, textAlign: 'center', color: '#94a3b8' }}>No hay ventas registradas en este mes.</Text>
            )}
          </View>
        </View>

        {/* Egresos (Gastos) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Desglose de Gastos</Text>
          <View style={styles.table}>
            <View style={styles.tHead}>
              <Text style={styles.col1}>Concepto</Text>
              <Text style={styles.col2}>Fecha</Text>
              <Text style={styles.col3}>Monto</Text>
            </View>
            {expenses.filter(e => !e.type || e.type === 'expense').map(e => (
              <View style={styles.tRow} key={e.id}>
                <Text style={styles.col1}>{e.description}</Text>
                <Text style={styles.col2}>{new Date(e.date).toLocaleDateString()}</Text>
                <Text style={styles.col3}>{formatCurrency(e.amount)}</Text>
              </View>
            ))}
            {expenses.filter(e => !e.type || e.type === 'expense').length === 0 && (
              <Text style={{ padding: 10, textAlign: 'center', color: '#94a3b8' }}>No hay gastos registrados en este mes.</Text>
            )}
          </View>
        </View>

      </Page>
    </Document>
  );
};
