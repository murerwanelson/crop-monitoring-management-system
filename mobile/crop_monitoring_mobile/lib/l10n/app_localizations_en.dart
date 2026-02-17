// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get appName => 'Crop Monitoring';

  @override
  String get welcomeBack => 'Welcome back,';

  @override
  String get fieldOperations => 'FIELD OPERATIONS';

  @override
  String get newObservation => 'New Observation';

  @override
  String get captureRealTimeData => 'Capture real-time field data';

  @override
  String get observationHistory => 'Observation History';

  @override
  String get viewManageRecords => 'View and manage local records';

  @override
  String get weatherReport => 'WEATHER REPORT';

  @override
  String get dataHealth => 'DATA HEALTH';

  @override
  String get cloudSynced => 'CLOUD SYNCED';

  @override
  String get offlinePending => 'OFFLINE PENDING';

  @override
  String get systemHealthy => 'System Healthy';

  @override
  String get syncing => 'Syncing...';

  @override
  String get login => 'Login';

  @override
  String get register => 'Register';

  @override
  String get email => 'Email';

  @override
  String get password => 'Password';

  @override
  String get forgotPassword => 'Forgot Password?';

  @override
  String get resetPassword => 'Reset Password';
}
