import 'package:flutter/material.dart';
// import '../widgets/gradient_button.dart'; // Removed unused
// import '../widgets/modern_text_field.dart'; // Removed unused
import '../utils/app_colors.dart';
// import '../utils/app_animations.dart'; // Removed unused
import 'package:supabase_flutter/supabase_flutter.dart';
import 'reset_password_screen.dart';
import '../widgets/wave_clipper.dart';

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({Key? key}) : super(key: key);

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen>
    with SingleTickerProviderStateMixin {
  final TextEditingController emailController = TextEditingController();
  bool _isLoading = false;
  late AnimationController _animController;
  late List<Animation<double>> _fadeAnimations;
  late List<Animation<Offset>> _slideAnimations;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      duration: const Duration(milliseconds: 1000),
      vsync: this,
    );

    _fadeAnimations = List.generate(
      4,
      (index) {
        final start = (index * 0.1).clamp(0.0, 1.0);
        final end = (0.6 + (index * 0.1)).clamp(0.0, 1.0);
        return Tween<double>(begin: 0.0, end: 1.0).animate(
          CurvedAnimation(
            parent: _animController,
            curve: Interval(start, end, curve: Curves.easeOut),
          ),
        );
      },
    );

    _slideAnimations = List.generate(
      4,
      (index) => Tween<Offset>(
        begin: const Offset(0, 0.2),
        end: Offset.zero,
      ).animate(
        CurvedAnimation(
          parent: _animController,
          curve: Interval(index * 0.1, 0.6 + (index * 0.1), curve: Curves.easeOutCubic),
        ),
      ),
    );

    _animController.forward();
  }

  @override
  void dispose() {
    _animController.dispose();
    emailController.dispose();
    super.dispose();
  }

  void _requestReset() async {
    if (emailController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter your email')),
      );
      return;
    }

    setState(() => _isLoading = true);
    try {
      await Supabase.instance.client.auth.resetPasswordForEmail(emailController.text);
      if (mounted) {
        setState(() => _isLoading = false);
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => ResetPasswordScreen(email: emailController.text),
          ),
        );
        
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Password reset email sent. Please check your inbox.'),
            backgroundColor: AppColors.successGreen,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: ${e.toString()}'),
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
              height: MediaQuery.of(context).size.height * 0.4,
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
                  SizedBox(height: MediaQuery.of(context).size.height * 0.35),
                  
                  _buildAnimatedWidget(0, const Text(
                    'Forgot Password',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 32,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF1B5E20),
                    ),
                  )),
                  const SizedBox(height: 12),
                  _buildAnimatedWidget(1, const Text(
                    'Enter your registered email address to receive a 6-digit reset code.',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 15,
                      color: Color(0xFF757575),
                      fontWeight: FontWeight.w500,
                    ),
                  )),
                  const SizedBox(height: 48),
                  
                  _buildAnimatedWidget(2, _buildInputField(
                    controller: emailController,
                    hint: 'Email Address',
                    icon: Icons.email_outlined,
                    keyboardType: TextInputType.emailAddress,
                  )),
                  
                  const SizedBox(height: 48),
                  
                  _buildAnimatedWidget(3, SizedBox(
                    width: double.infinity,
                    height: 56,
                    child: ElevatedButton(
                      onPressed: _isLoading ? null : _requestReset,
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
                            'Send Reset Code',
                            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                          ),
                    ),
                  )),
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
        keyboardType: keyboardType,
        decoration: InputDecoration(
          hintText: hint,
          hintStyle: const TextStyle(color: Color(0xFF757575), fontSize: 15),
          prefixIcon: Icon(icon, color: const Color(0xFF1B5E20), size: 22),
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
