import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/sync_provider.dart';
import '../utils/app_colors.dart';
// import '../utils/app_animations.dart'; // Removed unused
// import '../widgets/gradient_button.dart'; // Removed unused
import '../widgets/modern_text_field.dart';
import '../widgets/wave_clipper.dart';
// import '../screens/forgot_password_screen.dart'; // Removed unused


class LoginScreen extends StatefulWidget {
  const LoginScreen({Key? key}) : super(key: key);

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen>
    with SingleTickerProviderStateMixin {
  final TextEditingController emailController = TextEditingController();
  final TextEditingController passwordController = TextEditingController();
  bool _isLoading = false;
  bool _rememberMe = false;
  bool _obscurePassword = true;
  late AnimationController _animController;
  late List<Animation<double>> _fadeAnimations;
  late List<Animation<Offset>> _slideAnimations;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      duration: const Duration(milliseconds: 1200),
      vsync: this,
    );

    // Create staggered fade and slide animations for form elements
    _fadeAnimations = List.generate(
      5,
      (index) {
        final start = (index * 0.15).clamp(0.0, 1.0);
        final end = (0.5 + (index * 0.15)).clamp(0.0, 1.0);
        return Tween<double>(begin: 0.0, end: 1.0).animate(
          CurvedAnimation(
            parent: _animController,
            curve: Interval(start, end, curve: Curves.easeOut),
          ),
        );
      },
    );

    _slideAnimations = List.generate(
      5,
      (index) {
        final start = (index * 0.15).clamp(0.0, 1.0);
        final end = (0.5 + (index * 0.15)).clamp(0.0, 1.0);
        return Tween<Offset>(
          begin: const Offset(0, 0.3),
          end: Offset.zero,
        ).animate(
          CurvedAnimation(
            parent: _animController,
            curve: Interval(start, end, curve: Curves.easeOutCubic),
          ),
        );
      },
    );

    _animController.forward();
  }

  @override
  void dispose() {
    _animController.dispose();
    emailController.dispose();
    passwordController.dispose();
    super.dispose();
  }

  bool _validateFields() {
    if (emailController.text.isEmpty || passwordController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Please enter both email and password'),
          backgroundColor: AppColors.errorRed,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      );
      return false;
    }
    return true;
  }

  void _login() async {
    if (!_validateFields()) return;
    
    setState(() => _isLoading = true);
    final authProvider = context.read<AuthProvider>();
    final syncProvider = context.read<SyncProvider>();

    final success = await authProvider.login(
      emailController.text.trim(),
      passwordController.text.trim(),
    );

    if (mounted) {
      setState(() => _isLoading = false);

      if (success) {
        await syncProvider.checkUnsynced();
        if (syncProvider.isOnline) {
          await syncProvider.startSync();
        }
        Navigator.pushReplacementNamed(context, '/dashboard');
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Login failed. Please check credentials.'),
            backgroundColor: AppColors.errorRed,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: Stack(
        children: [
          // 1. Main Content (Moved to back so it scrolls under the image)
          SafeArea(
            child: SingleChildScrollView(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 30),
                child: Column(
                  children: [
                    SizedBox(height: MediaQuery.of(context).size.height * 0.38),
                    
                    // Welcome Header
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        const Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Welcome Back',
                              style: TextStyle(
                                fontSize: 36,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF1B5E20),
                                letterSpacing: -0.5,
                              ),
                            ),
                            Text(
                              'Login to your account',
                              style: TextStyle(
                                fontSize: 16,
                                color: Color(0xFF9E9E9E),
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(width: 8),
                        Padding(
                          padding: const EdgeInsets.only(bottom: 8.0),
                          child: Icon(
                            Icons.eco_rounded,
                            color: Colors.green.shade700,
                            size: 32,
                          ),
                        ),
                      ],
                    ),
                    
                    const SizedBox(height: 50),
                    
                    // Form Fields
                    _buildAnimatedWidget(
                      1,
                      _buildInputField(
                        controller: emailController,
                        hint: 'Email Address',
                        icon: Icons.person_outline_rounded,
                      ),
                    ),
                    const SizedBox(height: 20),
                    _buildAnimatedWidget(
                      2,
                      _buildInputField(
                        controller: passwordController,
                        hint: 'Password',
                        icon: Icons.lock_outline_rounded,
                        isPassword: true,
                      ),
                    ),
                    
                    const SizedBox(height: 15),
                    
                    // Remember Me & Forgot Password
                    _buildAnimatedWidget(
                      3,
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Row(
                            children: [
                              SizedBox(
                                height: 24,
                                width: 24,
                                child: Checkbox(
                                  value: _rememberMe,
                                  onChanged: (val) => setState(() => _rememberMe = val!),
                                  activeColor: const Color(0xFF2E7D32),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 8),
                              const Text(
                                'Remember Me',
                                style: TextStyle(
                                  fontSize: 13,
                                  color: Color(0xFF9E9E9E),
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ],
                          ),
                          TextButton(
                            onPressed: () => Navigator.pushNamed(context, '/forgot-password'),
                            child: const Text(
                              'Forgot Password ?',
                              style: TextStyle(
                                fontSize: 13,
                                color: Color(0xFF2E7D32),
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    
                    const SizedBox(height: 50),
                    
                    // Login Button
                    _buildAnimatedWidget(
                      4,
                      SizedBox(
                        width: double.infinity,
                        height: 56,
                        child: ElevatedButton(
                          onPressed: _isLoading ? null : _login,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF388E3C),
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(30),
                            ),
                            elevation: 0,
                          ),
                          child: _isLoading 
                            ? const CircularProgressIndicator(color: Colors.white)
                            : const Text(
                                'Login',
                                style: TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                        ),
                      ),
                    ),
                    
                    const SizedBox(height: 30),
                    
                    // Sign Up Link
                    _buildAnimatedWidget(
                      4,
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Text(
                            "Don't have account? ",
                            style: TextStyle(
                              color: Color(0xFF9E9E9E),
                              fontSize: 14,
                            ),
                          ),
                          GestureDetector(
                            onTap: () => Navigator.pushNamed(context, '/register'),
                            child: const Text(
                              'Sign up',
                              style: TextStyle(
                                color: Color(0xFF2E7D32),
                                fontWeight: FontWeight.bold,
                                fontSize: 14,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),

          // 2. Upper tropical leaves (Moved to front with IgnorePointer)
          IgnorePointer(
            child: ClipPath(
              clipper: WaveClipper(),
              child: Stack(
                children: [
                  Container(
                    height: MediaQuery.of(context).size.height * 0.45,
                    decoration: const BoxDecoration(
                      image: DecorationImage(
                        image: AssetImage('assets/images/tropical_leaves.png'),
                        fit: BoxFit.cover,
                      ),
                    ),
                  ),
                  Container(
                    height: MediaQuery.of(context).size.height * 0.45,
                    color: Colors.black.withValues(alpha: 0.1),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
      
      // Back Button (Moved to end of stack to be on top)
      floatingActionButtonLocation: FloatingActionButtonLocation.startTop,
      floatingActionButton: Padding(
        padding: const EdgeInsets.only(top: 10, left: 10),
        child: GestureDetector(
          onTap: () => Navigator.pop(context),
          child: Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: const Color(0xFFE8F5E9),
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.05),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: const Icon(
              Icons.arrow_back_ios_new_rounded,
              color: Color(0xFF2E7D32),
              size: 20,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildInputField({
    required TextEditingController controller,
    required String hint,
    required IconData icon,
    bool isPassword = false,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFFE8F5E9),
        borderRadius: BorderRadius.circular(15),
        border: Border.all(
          color: const Color(0xFF1B5E20).withValues(alpha: 0.1),
          width: 1.2,
        ),
      ),
      child: TextField(
        controller: controller,
        obscureText: isPassword ? _obscurePassword : false,
        decoration: InputDecoration(
          hintText: hint,
          hintStyle: const TextStyle(color: Color(0xFF757575), fontSize: 15),
          prefixIcon: Icon(icon, color: const Color(0xFF1B5E20), size: 22),
          suffixIcon: isPassword 
            ? IconButton(
                icon: Icon(
                  _obscurePassword ? Icons.visibility_outlined : Icons.visibility_off_outlined,
                  color: const Color(0xFF1B5E20),
                  size: 20,
                ),
                onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
              )
            : null,
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        ),
      ),
    );
  }

  Widget _buildAnimatedWidget(int index, Widget child) {
    return SlideTransition(
      position: _slideAnimations[index],
      child: FadeTransition(
        opacity: _fadeAnimations[index],
        child: child,
      ),
    );
  }
}
