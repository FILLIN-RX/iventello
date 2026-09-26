import 'package:drift/drift.dart';
import 'package:drift/native.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:iventello/main.dart';
import 'package:iventello/src/core/database/app_database.dart';
import 'package:iventello/src/features/auth/domain/repositories/auth_repository.dart';
import 'package:iventello/src/features/auth/data/repositories/auth_repository_impl.dart';
import 'package:iventello/src/features/auth/presentation/bloc/auth_bloc.dart';
import 'package:iventello/src/features/auth/presentation/bloc/auth_event.dart';
import 'package:iventello/src/features/auth/presentation/bloc/auth_state.dart';

void main() {
  testWidgets('Flow Onboarding Initial au premier lancement', (WidgetTester tester) async {
    final db = AppDatabase.forTesting(DatabaseConnection(NativeDatabase.memory()));
    final authRepo = AuthRepositoryImpl(db: db);
    final authBloc = AuthBloc(authRepository: authRepo);
    final expectation = expectLater(
      authBloc.stream.map((s) => s.status),
      emitsThrough(AuthStatus.needsOnboarding),
    );
    authBloc.add(CheckAuthSessionEvent());

    // Attendre que le statut passe à needsOnboarding
    await expectation;

    await tester.pumpWidget(
      MultiRepositoryProvider(
        providers: [
          RepositoryProvider<AppDatabase>.value(value: db),
          RepositoryProvider<AuthRepository>.value(value: authRepo),
        ],
        child: BlocProvider<AuthBloc>.value(
          value: authBloc,
          child: const MaterialApp(
            home: AuthGatekeeper(),
          ),
        ),
      ),
    );

    await tester.pump();
    await tester.pump(const Duration(milliseconds: 900));
    await tester.pump();

    expect(find.text('1. Super Admin'), findsOneWidget);

    await db.close();
  });
}
