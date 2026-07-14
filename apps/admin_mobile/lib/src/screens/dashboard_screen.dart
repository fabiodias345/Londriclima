import 'package:flutter/material.dart';

import '../services/admin_api_client.dart';
import '../theme/admin_theme.dart';
import 'admin_module.dart';
import 'login_screen.dart';
import 'module_screen.dart';

class DashboardScreen extends StatelessWidget {
  const DashboardScreen({
    super.key,
    required this.session,
    required this.apiClient,
  });

  final AdminSession session;
  final AdminApiClient apiClient;

  static const _items = [
    DashboardItem(AdminModuleKind.orders, 'O.S.', 'Abertas, andamento e concluidas', Icons.assignment_outlined, adminBlue),
    DashboardItem(AdminModuleKind.schedule, 'Agenda', 'Hoje, atrasos e proximas visitas', Icons.calendar_month_outlined, adminGreen),
    DashboardItem(AdminModuleKind.clients, 'Clientes', 'Cadastro e maquinas por cliente', Icons.groups_outlined, adminCyan),
    DashboardItem(AdminModuleKind.pmoc, 'PMOC', 'PDF, assinatura e pendencias', Icons.verified_user_outlined, adminPurple),
    DashboardItem(AdminModuleKind.fleet, 'Frota', 'Veiculos, consumo e abastecimento', Icons.local_shipping_outlined, adminOrange),
    DashboardItem(AdminModuleKind.reports, 'Relatorios', 'Indicadores e envios', Icons.bar_chart_outlined, Color(0xFF5964D8)),
    DashboardItem(AdminModuleKind.technicians, 'Tecnicos', 'Equipe, acessos e convites', Icons.engineering_outlined, Color(0xFF0F766E)),
    DashboardItem(AdminModuleKind.pending, 'Pendencias', 'Alertas que exigem acao', Icons.warning_amber_outlined, adminRed),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Clima Admin',
          style: TextStyle(fontWeight: FontWeight.w900),
        ),
        actions: [
          IconButton(
            tooltip: 'Sair',
            onPressed: () {
              Navigator.of(context).pushReplacement(
                MaterialPageRoute(
                  builder: (_) => LoginScreen(apiClient: apiClient),
                ),
              );
            },
            icon: const Icon(Icons.logout),
          ),
        ],
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(18, 8, 18, 24),
          children: [
            _Header(session: session),
            const SizedBox(height: 18),
            const Text(
              'Acesso rapido',
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.w900,
                color: adminInk,
              ),
            ),
            const SizedBox(height: 12),
            GridView.builder(
              itemCount: _items.length,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                mainAxisSpacing: 12,
                crossAxisSpacing: 12,
                childAspectRatio: 0.95,
              ),
              itemBuilder: (context, index) {
                final item = _items[index];
                return _DashboardCard(
                  item: item,
                  onTap: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => ModuleScreen(
                          item: item,
                          session: session,
                          apiClient: apiClient,
                        ),
                      ),
                    );
                  },
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({required this.session});

  final AdminSession session;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: adminInk,
        borderRadius: BorderRadius.circular(18),
      ),
      child: Row(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(14),
            child: Image.asset(
              'assets/airmovebr-logo.png',
              width: 58,
              height: 58,
              fit: BoxFit.cover,
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  session.userName,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 4),
                const Text(
                  'Administrador autenticado',
                  style: TextStyle(color: Color(0xFFB8C6D6)),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _DashboardCard extends StatelessWidget {
  const _DashboardCard({required this.item, required this.onTap});

  final DashboardItem item;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: item.color,
      borderRadius: BorderRadius.circular(18),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(18),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 46,
                height: 46,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.20),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Icon(item.icon, color: Colors.white, size: 27),
              ),
              const Spacer(),
              Text(
                item.title,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 21,
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                item.subtitle,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  color: Color(0xFFF3F7FB),
                  fontSize: 12.5,
                  height: 1.2,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
