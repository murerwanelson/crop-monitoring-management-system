import 'package:flutter/material.dart';
import '../widgets/gradient_button.dart';
import '../widgets/modern_text_field.dart';
import '../utils/app_colors.dart';
import '../utils/app_animations.dart';
import '../services/api_service.dart';
import '../widgets/wave_clipper.dart';

class ResetPasswordScreen extends StatefulWidget {
  final String email;
  const ResetPasswordScreen({Key? key, required this.email}) : super(key: key);

  @override
  State<ResetPasswordScreen> createState() => _ResetPasswordScreenState();
}

class _ResetPasswordScreenState extends State<ResetPasswordScreen>
    with SingleTickerProviderStateMixin {
  final TextEditingController tokenController = TextEditingController();
  final TextEditingController passwordController = TextEditingController();
  final TextEditingController confirmPasswordController = TextEditingController();
  bool _isLoading = false;
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

    _fadeAnimations = List.generate(
      6,
      (index) => Tween<double>(begin: 0.0, end: 1.0).animate(
        CurvedAnimation(
          parent: _animController,
          curve: Interval(index * 0.08, 0.5 + (index * 0.08), curve: Curves.easeOut),
        ),
      ),
    );

    _slideAnimations = List.generate(
      6,
      (index) => Tween<Offset>(
        begin: const Offset(0, 0.2),
        end: Offset.zero,
      ).animate(
        CurvedAnimation(
          parent: _animController,
          curve: Interval(index * 0.08, 0.5 + (index * 0.08), curve: Curves.easeOutCubic),
        ),
      ),
    );

    _animController.forward();
  }

  @override
  void dispose() {
    _animController.dispose();
    tokenController.dispose();
    passwordController.dispose();
    confirmPasswordController.dispose();
    super.dispose();
  }

  void _resetPassword() async {
    if (tokenController.text.length != 6) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter the 6-digit code')),
      );
      return;
    }

    if (passwordController.text.length < 8) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Password must be at least 8 characters')),
      );
      return;
    }

    if (passwordController.text != confirmPasswordController.text) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Passwords do not match')),
      );
      return;
    }

    setState(() => _isLoading = true);
    final apiService = ApiService();
    final success = await apiService.resetPassword(
      tokenController.text,
      passwordController.text,
    );
    
    if (mounted) {
      setState(() => _isLoading = false);
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Password reset successfully! Please login.'),
            backgroundColor: AppColors.successGreen,
            behavior: SnackBarBehavior.floating,
          ),
        );
        Navigator.popUntil(context, ModalRoute.withName('/login'));
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Invalid or expired code. Please try again.'),
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
          // Background with Wave
          ClipPath(
            clipper: WaveClipper(),
            child: Container(
              height: MediaQuery.of(context).size.height * 0.35,
              decoration: const BoxDecoration(
                image: DecorationImage(
                  image: AssetImage('assets/images/tropical_leaves.png'),
                  fit: BoxFit.cover,
                ),
              ),
            ),
          ),
          
          SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 30),
              child: Column(
                children: [
                  SizedBox(height: MediaQuery.of(context).size.height * 0.32),
                  
                  _buildAnimatedWidget(0, const Text(
                    'Reset Password',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 32,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF1B5E20),
                    ),
                  )),
                  const SizedBox(height: 12),
                  _buildAnimatedWidget(1, Text(
                    'Enter the 6-digit code sent to ${widget.email} and your new password.',
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      fontSize: 14,
                      color: Color(0xFF757575),
                      fontWeight: FontWeight.w500,
                    ),
                  )),
                  const SizedBox(height: 32),
                  
                  _buildAnimatedWidget(2, _buildInputField(
                    controller: tokenController,
                    hint: '6-Digit Code',
                    icon: Icons.pin_rounded,
                    keyboardType: TextInputType.number,
                  )),
                  const SizedBox(height: 16),
                  _buildAnimatedWidget(3, _buildInputField(
                    controller: passwordController,
                    hint: 'New Password',
                    icon: Icons.lock_outline_rounded,
                    isPassword: true,
                  )),
                  const SizedBox(height: 16),
                  _buildAnimatedWidget(4, _buildInputField(
                    controller: confirmPasswordController,
                    hint: 'Confirm Password',
                    icon: Icons.lock_outline_rounded,
                    isPassword: true,
                  )),
                  
                  const SizedBox(height: 40),
                  
                  _buildAnimatedWidget(5, SizedBox(
                    width: double.infinity,
                    height: 56,
                    child: ElevatedButton(
                      onPressed: _isLoading ? null : _resetPassword,
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
                            'Update Password',
                            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                          ),
                    ),
                  )),
                  const SizedBox(height: 40),
                ],
              ),
            ),
          ),
        ],
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.startTop,
      floatingActionButton: Padding(
        padding: const EdgeInsets.only(top: 10, left: 10),
        child: GestureDetector(
          onTap: () => Navigator.pop(context),
          child: Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.15),
              shape: BoxShape.circle,
              border: Border.all(
                color: Colors.white.withValues(alpha: 0.3),
                width: 1.5,
              ),
            ),
            child: const Icon(
              Icons.arrow_back_ios_new_rounded,
              color: Colors.white,
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
          color: const Color(0xFF1B5E20).withOpacity(0.1),
          width: 1.2,
        ),
      ),
      child: TextField(
        controller: controller,
        obscureText: isPassword,
        keyboardType: keyboardType,
        decoration: InputDecoration(
          hintText: hint,
          hintStyle: const TextStyle(color: Color(0xFF757575), fontSize: 15),
          prefixIcon: Icon(icon, color: const Color(0xFF1B5E20), size: 22),
          suffixIcon: isPassword 
            ? const Icon(Icons.visibility_outlined, color: Color(0xFF1B5E20), size: 20)
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
