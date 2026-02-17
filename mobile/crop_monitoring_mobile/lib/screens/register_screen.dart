import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/sync_provider.dart';
import '../utils/app_colors.dart';
// import '../utils/app_animations.dart'; // Removed unused
// import '../widgets/gradient_button.dart'; // Removed unused
import '../widgets/modern_text_field.dart';
import '../widgets/wave_clipper.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({Key? key}) : super(key: key);

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen>
    with SingleTickerProviderStateMixin {
  final TextEditingController emailController = TextEditingController();
  final TextEditingController passwordController = TextEditingController();
  final TextEditingController _firstNameController = TextEditingController();
  final TextEditingController _lastNameController = TextEditingController();
  bool _isLoading = false;
  bool _obscurePassword = true;
  late AnimationController _animController;
  late List<Animation<double>> _fadeAnimations;
  late List<Animation<Offset>> _slideAnimations;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      duration: const Duration(milliseconds: 1400),
      vsync: this,
    );

    // Create staggered animations for form elements
    _fadeAnimations = List.generate(
      7,
      (index) {
        final start = (index * 0.12).clamp(0.0, 1.0);
        final end = (0.5 + (index * 0.12)).clamp(0.0, 1.0);
        return Tween<double>(begin: 0.0, end: 1.0).animate(
          CurvedAnimation(
            parent: _animController,
            curve: Interval(start, end, curve: Curves.easeOut),
          ),
        );
      },
    );

    _slideAnimations = List.generate(
      7,
      (index) {
        final start = (index * 0.12).clamp(0.0, 1.0);
        final end = (0.5 + (index * 0.12)).clamp(0.0, 1.0);
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
    _firstNameController.dispose();
    _lastNameController.dispose();
    super.dispose();
  }

  String? _validateEmail(String? value) {
    if (value == null || value.isEmpty) {
      return 'Email is required';
    }
    final emailRegex = RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$');
    if (!emailRegex.hasMatch(value)) {
      return 'Invalid email';
    }
    return null;
  }

  void _register() async {
    if (_firstNameController.text.isEmpty ||
        _lastNameController.text.isEmpty ||
        emailController.text.isEmpty || 
        passwordController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please fill in all fields'),
          backgroundColor: AppColors.errorRed,
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    if (_validateEmail(emailController.text) != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please enter a valid email'),
          backgroundColor: AppColors.errorRed,
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    setState(() => _isLoading = true);
    
    final authProvider = context.read<AuthProvider>();
    final syncProvider = context.read<SyncProvider>();

    final success = await authProvider.register({
      'email': emailController.text.trim(),
      'password': passwordController.text.trim(),
      'first_name': _firstNameController.text.trim(),
      'last_name': _lastNameController.text.trim(),
    });
    
    if (mounted) {
      setState(() => _isLoading = false);
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Account created successfully! Please login.'),
            backgroundColor: AppColors.successGreen,
            behavior: SnackBarBehavior.floating,
          ),
        );
        Navigator.pushReplacementNamed(context, '/login');
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Registration failed. Email might already be taken.'),
            backgroundColor: AppColors.errorRed,
            behavior: SnackBarBehavior.floating,
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
                    SizedBox(height: MediaQuery.of(context).size.height * 0.35),
                    
                    // Header
                    _buildAnimatedWidget(0, const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Join Us',
                              style: TextStyle(
                                fontSize: 36,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF1B5E20),
                                letterSpacing: -0.5,
                              ),
                            ),
                            Text(
                              'Create your new account',
                              style: TextStyle(
                                fontSize: 16,
                                color: Color(0xFF9E9E9E),
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ],
                        ),
                        SizedBox(width: 8),
                        Padding(
                          padding: const EdgeInsets.only(bottom: 8.0),
                          child: Icon(
                            Icons.person_add_rounded,
                            color: Color(0xFF2E7D32),
                            size: 32,
                          ),
                        ),
                      ],
                    )),
                    
                    const SizedBox(height: 40),
                    
                    // Form Fields
                    _buildAnimatedWidget(1, _buildInputField(
                      controller: _firstNameController,
                      hint: 'First Name',
                      icon: Icons.person_outline_rounded,
                    )),
                    const SizedBox(height: 16),
                    _buildAnimatedWidget(2, _buildInputField(
                      controller: _lastNameController,
                      hint: 'Last Name',
                      icon: Icons.person_outline_rounded,
                    )),
                    const SizedBox(height: 16),
                    _buildAnimatedWidget(3, _buildInputField(
                      controller: emailController,
                      hint: 'Email Address',
                      icon: Icons.email_outlined,
                      keyboardType: TextInputType.emailAddress,
                    )),
                    const SizedBox(height: 16),
                    _buildAnimatedWidget(4, _buildInputField(
                      controller: passwordController,
                      hint: 'Password',
                      icon: Icons.lock_outline_rounded,
                      isPassword: true,
                    )),
                    
                    const SizedBox(height: 40),
                    
                    // Register Button
                    _buildAnimatedWidget(
                      5,
                      SizedBox(
                        width: double.infinity,
                        height: 56,
                        child: ElevatedButton(
                          onPressed: _isLoading ? null : _register,
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
                                'Create Account',
                                style: TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                        ),
                      ),
                    ),
                    
                    const SizedBox(height: 30),
                    
                    // Already have an account
                    _buildAnimatedWidget(
                      6,
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Text(
                            "Already have an account? ",
                            style: TextStyle(
                              color: Color(0xFF9E9E9E),
                              fontSize: 14,
                            ),
                          ),
                          GestureDetector(
                            onTap: () => Navigator.pop(context),
                            child: const Text(
                              'Sign in',
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
                    const SizedBox(height: 40),
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
                    height: MediaQuery.of(context).size.height * 0.4,
                    decoration: const BoxDecoration(
                      image: DecorationImage(
                        image: AssetImage('assets/images/tropical_leaves.png'),
                        fit: BoxFit.cover,
                      ),
                    ),
                  ),
                  Container(
                    height: MediaQuery.of(context).size.height * 0.4,
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
    TextInputType keyboardType = TextInputType.text,
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
        keyboardType: keyboardType,
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