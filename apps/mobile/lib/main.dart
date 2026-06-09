import 'package:flutter/material.dart';

import 'src/router/app_router.dart';

void main() {
  runApp(const BolPayApp());
}

class BolPayApp extends StatelessWidget {
  const BolPayApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'BolPay',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorSchemeSeed: const Color(0xFF2563EB),
        useMaterial3: true,
      ),
      routerConfig: appRouter,
    );
  }
}
